import SwiftUI
import RealityKit
import ARKit

struct SwiftXRApp: App {
    var body: some Scene {
        WindowGroup {
            MainARView()
        }
    }
}

struct MainARView: View {
    @State private var arView = ARView()
    @State private var currentModel: Entity?
    @State private var isLoading = false
    @State private var loadingProgress: Double = 0

    // Your GLB model names - NO CONVERSION NEEDED!
    let availableModels = ["fr222", "model2", "model3"] // Your actual .glb files

    var body: some View {
        ZStack {
            // AR View
            ARViewContainer(arView: arView)

            // Loading
            if isLoading {
                VStack(spacing: 16) {
                    ProgressView(value: loadingProgress, total: 1.0)
                        .progressViewStyle(LinearProgressViewStyle(tint: .orange))
                        .frame(width: 200)
                    
                    Text("Loading 3D Model...")
                        .font(.headline)
                        .foregroundColor(.white)
                    
                    Text("Using GLB • 4-5MB • Fast Loading")
                        .font(.caption)
                        .foregroundColor(.white.opacity(0.8))
                }
                .padding()
                .background(Color.black.opacity(0.8))
                .cornerRadius(12)
            }

            // Controls
            VStack {
                // Model selector
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 12) {
                        ForEach(availableModels, id: \.self) { model in
                            Button(action: {
                                loadGLBModel(model)
                            }) {
                                Text(model)
                                    .font(.system(size: 14, weight: .medium))
                                    .foregroundColor(.white)
                                    .padding(.horizontal, 16)
                                    .padding(.vertical, 10)
                                    .background(Color.blue)
                                    .cornerRadius(8)
                            }
                            .disabled(isLoading)
                        }
                    }
                    .padding()
                }

                Spacer()

                // Info
                VStack(spacing: 8) {
                    Text("🚀 Native SwiftXR + GLB")
                        .font(.system(size: 16, weight: .bold))
                    Text("4-5MB files • Instant loading")
                        .font(.system(size: 12))
                    Text("Tap to select parts")
                        .font(.system(size: 12))
                }
                .padding()
                .background(Color.black.opacity(0.7))
                .foregroundColor(.white)
                .cornerRadius(10)
                .padding(.bottom, 30)
            }
        }
        .onAppear {
            setupAR()
            // Auto-load your main model
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
                loadGLBModel("fr222")
            }
        }
        .onOpenURL { url in
            handleDeepLink(url: url)
        }
    }

    private func handleDeepLink(url: URL) {
        guard url.scheme == "swiftxr" else { return }
        
        // Parse URL: swiftxr://model?name=MODEL_NAME&url=MODEL_URL
        guard let components = URLComponents(url: url, resolvingAgainstBaseURL: false),
              components.host == "model" else { return }
        
        var modelName: String?
        var modelUrl: String?
        
        // Extract query parameters
        components.queryItems?.forEach { item in
            if item.name == "name" {
                modelName = item.value
            } else if item.name == "url" {
                modelUrl = item.value
            }
        }
        
        print("🔗 Deep link received - Name: \(modelName ?? "nil"), URL: \(modelUrl ?? "nil")")
        
        // Prioritize URL over name (for remote GLB loading)
        if let urlString = modelUrl, let remoteUrl = URL(string: urlString) {
            loadGLBFromRemote(url: remoteUrl, modelName: modelName ?? "Remote Model")
        } else if let name = modelName {
            loadGLBModel(name)
        }
    }

    private func setupAR() {
        let config = ARWorldTrackingConfiguration()
        config.planeDetection = [.horizontal, .vertical]
        config.environmentTexturing = .automatic
        
        // Enable better tracking
        if ARWorldTrackingConfiguration.supportsSceneReconstruction(.mesh) {
            config.sceneReconstruction = .mesh
        }
        
        arView.session.run(config)

        // Add coaching overlay
        let coachingOverlay = ARCoachingOverlayView()
        coachingOverlay.session = arView.session
        coachingOverlay.goal = .horizontalPlane
        coachingOverlay.translatesAutoresizingMaskIntoConstraints = false
        arView.addSubview(coachingOverlay)

        NSLayoutConstraint.activate([
            coachingOverlay.centerXAnchor.constraint(equalTo: arView.centerXAnchor),
            coachingOverlay.centerYAnchor.constraint(equalTo: arView.centerYAnchor),
            coachingOverlay.widthAnchor.constraint(equalTo: arView.widthAnchor),
            coachingOverlay.heightAnchor.constraint(equalTo: arView.heightAnchor)
        ])
    }

    private func loadGLBModel(_ name: String) {
        isLoading = true
        loadingProgress = 0

        // Simulate progress
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
            loadingProgress = 0.3
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
            loadingProgress = 0.7
        }

        // Load GLB directly - no conversion needed!
        if let entity = GLBLoader.loadGLBFromBundle(named: name) {
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                loadingProgress = 1.0
                placeModel(entity)
                print("✅ Loaded GLB: \(name)")
                isLoading = false
            }
        } else {
            print("❌ Failed to load: \(name)")
            // Fallback to simple shape
            createFallbackModel(name: name)
            isLoading = false
        }
    }
    
    private func loadGLBFromRemote(url: URL, modelName: String) {
        isLoading = true
        loadingProgress = 0
        
        print("📥 Loading remote GLB: \(url.absoluteString)")
        
        // Simulate progress for remote loading
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.2) {
            loadingProgress = 0.2
        }
        
        // Load GLB from remote URL
        GLBLoader.loadGLBFromRemoteURL(url.absoluteString) { [weak self] entity in
            DispatchQueue.main.async {
                self?.loadingProgress = 1.0
                
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.2) {
                    self?.isLoading = false
                    
                    if let entity = entity {
                        self?.placeModel(entity)
                        print("✅ Loaded remote GLB: \(modelName)")
                    } else {
                        print("❌ Failed to load remote GLB: \(modelName)")
                        self?.createFallbackModel(name: modelName)
                    }
                }
            }
        }
    }

    private func placeModel(_ entity: Entity) {
        // Clear previous
        arView.scene.anchors.removeAll()

        // Create anchor and add model
        let anchor = AnchorEntity(.plane(.horizontal, classification: .any, minimumBounds: [1.0, 1.0]))

        // Scale if needed (adjust based on your model size)
        entity.transform.scale = [0.5, 0.5, 0.5]

        anchor.addChild(entity)
        arView.scene.addAnchor(anchor)
        currentModel = anchor
    }

    private func createFallbackModel(name: String) {
        let box = MeshResource.generateBox(size: 0.3)
        let material = SimpleMaterial(color: .systemBlue, isMetallic: true)
        let model = ModelEntity(mesh: box, materials: [material])
        placeModel(model)
    }
}

// UIViewRepresentable for ARView
struct ARViewContainer: UIViewRepresentable {
    let arView: ARView

    func makeUIView(context: Context) -> ARView {
        return arView
    }

    func updateUIView(_ uiView: ARView, context: Context) {}
}

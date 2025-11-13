import RealityKit
import SceneKit
import ModelIO

class GLBLoader {
    static func loadGLBFromBundle(named name: String) -> Entity? {
        guard let url = Bundle.main.url(forResource: name, withExtension: "glb") else {
            print("❌ GLB file not found: \(name)")
            return nil
        }

        return loadGLBFromURL(url)
    }

    static func loadGLBFromURL(_ url: URL) -> Entity? {
        do {
            let asset = MDLAsset(url: url)

            // Create RealityKit entity from ModelIO asset
            let entity = try Entity.loadModel(contentsOf: url)
            return entity

        } catch {
            print("❌ GLB loading failed: \(error)")
            return nil
        }
    }

    static func loadGLBFromRemoteURL(_ urlString: String, completion: @escaping (Entity?) -> Void) {
        guard let url = URL(string: urlString) else {
            completion(nil)
            return
        }

        // Download first, then load
        downloadFile(from: url) { localURL in
            guard let localURL = localURL else {
                completion(nil)
                return
            }

            let entity = loadGLBFromURL(localURL)
            completion(entity)
        }
    }

    private static func downloadFile(from url: URL, completion: @escaping (URL?) -> Void) {
        // Show download progress
        print("📥 Starting download: \(url.lastPathComponent)")
        
        let task = URLSession.shared.downloadTask(with: url) { tempURL, response, error in
            guard let tempURL = tempURL, error == nil else {
                print("❌ Download error: \(error?.localizedDescription ?? "Unknown error")")
                completion(nil)
                return
            }

            // Move to permanent location for caching
            let fileManager = FileManager.default
            let documentsURL = fileManager.urls(for: .documentDirectory, in: .userDomainMask)[0]
            let permanentURL = documentsURL.appendingPathComponent(url.lastPathComponent)

            do {
                // Remove existing file if present
                if fileManager.fileExists(atPath: permanentURL.path) {
                    try fileManager.removeItem(at: permanentURL)
                }
                try fileManager.moveItem(at: tempURL, to: permanentURL)
                completion(permanentURL)
            } catch {
                completion(nil)
            }
        }.resume()
    }
}

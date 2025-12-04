import json
import sys
import os
import math
from typing import Dict, Any, List

# This script is designed to run within Blender's Python environment (bpy).
# Usage: blender --background --python model_generator.py -- <input_json> <output_glb>

try:
    import bpy
    import bmesh
    from mathutils import Vector, Matrix
except ImportError:
    print("This script must be run inside Blender.")
    # Mock for testing outside Blender if needed, or just exit
    # sys.exit(1)

def clear_scene():
    """Clear existing objects from the scene"""
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete()

def create_material(name: str, color: tuple, metallic: float = 0.0, roughness: float = 0.5, alpha: float = 1.0):
    """Create a PBR material"""
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    bsdf = nodes.get("Principled BSDF")
    
    bsdf.inputs['Base Color'].default_value = (*color, 1)
    bsdf.inputs['Metallic'].default_value = metallic
    bsdf.inputs['Roughness'].default_value = roughness
    bsdf.inputs['Alpha'].default_value = alpha
    
    if alpha < 1.0:
        mat.blend_method = 'BLEND'
        mat.shadow_method = 'NONE'
        
    return mat

def create_profile_extrusion(name: str, profile_points: List[tuple], height: float, matrix: Matrix = None):
    """Extrude a 2D profile shape to create a 3D bar"""
    # Create mesh and object
    mesh = bpy.data.meshes.new(name)
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    
    # Create profile
    bm = bmesh.new()
    verts = [bm.verts.new((x, y, 0)) for x, y in profile_points]
    
    # Connect vertices to form a face
    if len(verts) > 2:
        bmesh.ops.contextual_create(bm, geom=verts, mat_indices=[0], use_smooth=False)
    
    # Extrude
    faces = bm.faces[:]
    res = bmesh.ops.extrude_face_region(bm, geom=faces)
    
    # Move extruded geometry
    extruded_verts = [v for v in res['geom'] if isinstance(v, bmesh.types.BMVert)]
    bmesh.ops.translate(bm, vec=Vector((0, 0, height)), verts=extruded_verts)
    
    # Apply to mesh
    bm.to_mesh(mesh)
    bm.free()
    
    if matrix:
        obj.matrix_world = matrix
        
    return obj

def generate_window_model(specs: Dict[str, Any]):
    """Generate a full window model from specifications"""
    
    # --- 1. Setup ---
    width = specs.get('width', 1.0)  # meters
    height = specs.get('height', 1.0) # meters
    profile_width = 0.06 # 60mm frame
    profile_depth = 0.06 # 60mm depth
    
    # Materials
    mat_aluminum = create_material("Aluminum", (0.8, 0.8, 0.8), metallic=0.9, roughness=0.2)
    mat_glass = create_material("Glass", (0.9, 0.9, 1.0), metallic=0.0, roughness=0.0, alpha=0.3)
    
    # --- 2. Create Frame (Simple Box for now, real profile would be more complex) ---
    # Bottom
    frame_bottom = create_profile_extrusion(
        "Frame_Bottom",
        [(-profile_depth/2, 0), (profile_depth/2, 0), (profile_depth/2, profile_width), (-profile_depth/2, profile_width)],
        width
    )
    # Rotate to horizontal
    frame_bottom.rotation_euler = (0, math.pi/2, 0)
    frame_bottom.location = (-width/2, 0, 0)
    frame_bottom.data.materials.append(mat_aluminum)
    
    # Top
    frame_top = frame_bottom.copy()
    frame_top.data = frame_bottom.data.copy() # Unlink data
    frame_top.location = (-width/2, height, 0)
    bpy.context.collection.objects.link(frame_top)
    
    # Left
    frame_left = create_profile_extrusion(
        "Frame_Left",
        [(-profile_depth/2, 0), (profile_depth/2, 0), (profile_depth/2, profile_width), (-profile_depth/2, profile_width)],
        height
    )
    frame_left.rotation_euler = (math.pi/2, 0, 0) # Vertical
    frame_left.location = (-width/2, 0, 0)
    frame_left.data.materials.append(mat_aluminum)
    
    # Right
    frame_right = frame_left.copy()
    frame_right.data = frame_left.data.copy()
    frame_right.location = (width/2, 0, 0)
    bpy.context.collection.objects.link(frame_right)
    
    # --- 3. Glass ---
    glass_thickness = 0.024 # 24mm DGU
    glass = create_profile_extrusion(
        "Glass",
        [(0, 0), (width - 2*profile_width, 0), (width - 2*profile_width, height - 2*profile_width), (0, height - 2*profile_width)],
        glass_thickness
    )
    # Center glass
    glass.location = (-width/2 + profile_width, profile_width, -glass_thickness/2)
    # Rotate upright
    glass.rotation_euler = (math.pi/2, 0, 0) 
    # Correction after rotation
    glass.location = (-width/2 + profile_width, 0, 0 + profile_width) # Adjust logic as needed
    
    # Simpler approach for glass: Create plane and extrude
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, height/2, 0), scale=(width - 2*profile_width, height - 2*profile_width, glass_thickness))
    glass_obj = bpy.context.active_object
    glass_obj.name = "Glass_Pane"
    glass_obj.data.materials.append(mat_glass)
    
    return

def main():
    # Parse args
    # Blender args are after "--"
    args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    
    if len(args) < 2:
        print("Usage: blender ... -- <input_json> <output_glb>")
        # Fallback for development
        input_json = {"width": 1.2, "height": 1.4, "type": "casement"}
        output_path = "output.glb"
    else:
        try:
            with open(args[0], 'r') as f:
                input_json = json.load(f)
            output_path = args[1]
        except Exception as e:
            print(f"Error reading input: {e}")
            return

    clear_scene()
    generate_window_model(input_json)
    
    # Export
    bpy.ops.export_scene.gltf(filepath=output_path, export_format='GLB', export_apply=True)
    print(f"Exported to {output_path}")

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"Script failed: {e}")
        # Don't crash Blender, just print


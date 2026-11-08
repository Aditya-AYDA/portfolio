"""
==============================================================================
BLENDER PYTHON SCRIPT: PREPARE CHARACTER GLB FOR THREE.JS WEB INTERACTION
==============================================================================
Author: Antigravity for Aditya Kapgate
Usage:
  1. Open Blender -> Scripting tab -> Paste & Run Script (Alt + P)
     OR
  2. Run from terminal / PowerShell:
     blender --background --python prepare_glb.py -- "input.glb" "output.glb"
==============================================================================
"""

import bpy
import sys
import os

# ----------------------------------------------------------------------------
# DEFAULT CONFIGURATION
# ----------------------------------------------------------------------------
DEFAULT_INPUT_GLB = os.path.abspath(r"assets/raw_character.glb")
DEFAULT_OUTPUT_GLB = os.path.abspath(r"assets/character.glb")

# Target eye positions (adjust coordinates to match your character's sockets)
EYE_L_POSITION = (-0.18, -0.32, 1.48)
EYE_R_POSITION = ( 0.18, -0.32, 1.48)
EYE_RADIUS = 0.085

# Decimate ratio (0.25 = reduce to 25% original face count to achieve < 5MB)
DECIMATE_RATIO = 0.25


def parse_cli_args():
    """Extract custom input/output paths if passed via command line."""
    argv = sys.argv
    if "--" in argv:
        custom_args = argv[argv.index("--") + 1:]
        input_path = custom_args[0] if len(custom_args) > 0 else DEFAULT_INPUT_GLB
        output_path = custom_args[1] if len(custom_args) > 1 else DEFAULT_OUTPUT_GLB
        return input_path, output_path
    return DEFAULT_INPUT_GLB, DEFAULT_OUTPUT_GLB


def clear_scene():
    """Delete all default objects (cube, light, camera)."""
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    for block in bpy.data.meshes:
        if block.users == 0:
            bpy.data.meshes.remove(block)
    for block in bpy.data.materials:
        if block.users == 0:
            bpy.data.materials.remove(block)


def import_glb(filepath):
    """Import the raw character GLB."""
    print(f"[Blender] Importing GLB: {filepath}")
    if not os.path.exists(filepath):
        raise FileNotFoundError(f"Input GLB file not found: {filepath}")
    bpy.ops.import_scene.gltf(filepath=filepath)


def decimate_meshes(ratio=0.25):
    """Add Decimate modifier to all imported mesh objects to compress polycount."""
    print(f"[Blender] Applying Decimate modifier with ratio: {ratio}")
    for obj in bpy.context.scene.objects:
        if obj.type == 'MESH':
            face_count = len(obj.data.polygons)
            print(f"  Mesh '{obj.name}' has {face_count} faces.")
            if face_count > 10000:
                mod = obj.modifiers.new(name="WebDecimate", type='DECIMATE')
                mod.ratio = ratio
                mod.use_collapse_triangulate = True
                print(f"  Added Decimate modifier to '{obj.name}'")


def create_eyeball(name, location, radius=0.085):
    """
    Create a UV Sphere eyeball with origin centered at geometry.
    In Three.js, lookAt rotates the object's +Z axis toward the target.
    """
    print(f"[Blender] Creating eyeball '{name}' at {location}")
    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=32,
        ring_count=16,
        radius=radius,
        location=location
    )
    eyeball = bpy.context.active_object
    eyeball.name = name

    # Ensure origin is exactly at center of geometry
    bpy.ops.object.origin_set(type='ORIGIN_GEOMETRY', center='MEDIAN')

    # Shade Smooth
    bpy.ops.object.shade_smooth()

    # Create Pixar-style eyeball material
    mat = bpy.data.materials.new(name=f"{name}_Material")
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    bsdf = nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs['Base Color'].default_value = (0.95, 0.94, 0.92, 1.0)
        bsdf.inputs['Roughness'].default_value = 0.1  # Glossy finish

    eyeball.data.materials.append(mat)
    return eyeball


def export_glb(filepath):
    """Export scene to GLB with modifiers applied."""
    print(f"[Blender] Exporting optimized GLB to: {filepath}")
    os.makedirs(os.path.dirname(os.path.abspath(filepath)), exist_ok=True)
    
    bpy.ops.export_scene.gltf(
        filepath=filepath,
        export_format='GLB',
        export_apply=True,              # Apply Modifiers (Decimate)
        export_image_format='JPEG',     # Compact textures
        export_jpeg_quality=85,
        export_materials='EXPORT',
        export_colors=True,
        export_cameras=False,
        export_lights=False
    )
    file_size_mb = os.path.getsize(filepath) / (1024 * 1024)
    print(f"[Blender] SUCCESS! Final file size: {file_size_mb:.2f} MB")


def main():
    input_path, output_path = parse_cli_args()
    clear_scene()

    try:
        import_glb(input_path)
    except Exception as err:
        print(f"[Blender Error] Could not load '{input_path}': {err}")
        print("[Blender Note] If running inside Blender without args, update DEFAULT_INPUT_GLB at top of script.")
        return

    # 1. Reduce polycount
    decimate_meshes(ratio=DECIMATE_RATIO)

    # 2. Add left & right eye tracking spheres
    create_eyeball(name="eye_L", location=EYE_L_POSITION, radius=EYE_RADIUS)
    create_eyeball(name="eye_R", location=EYE_R_POSITION, radius=EYE_RADIUS)

    # 3. Export clean web-ready GLB
    export_glb(output_path)
    print("All done!")


if __name__ == "__main__":
    main()

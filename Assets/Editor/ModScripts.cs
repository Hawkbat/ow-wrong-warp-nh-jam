using System;
using System.Collections;
using System.Collections.Generic;
using System.Linq;
using System.IO;
using UnityEditor;
using UnityEngine;

public static class ModScripts
{
    [MenuItem("Export/Build Mod Files")]
    static void BuildAllModFiles()
    {
        var settings = OuterWildsSettings.GetOrCreateSettings();
        var assetBundleDirectory = settings.m_AssetBundleOutputPath;
        Debug.Log("Asset Bundle Path: " + assetBundleDirectory);
        var modOutputRootDirectory = settings.m_ModOutputPath;
        modOutputRootDirectory = modOutputRootDirectory.Replace("%APPDATA%", Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData));
        Debug.Log("Mod Output Path: " + modOutputRootDirectory);
        var rootDirectory = Directory.GetCurrentDirectory();
        Debug.Log("Project Root Path: " + rootDirectory);
        var manifestPath = Path.Combine(rootDirectory, "manifest.json");
        Debug.Log("Manifest Path: " + manifestPath);
        var manifest = JsonUtility.FromJson<ManifestJson>(File.ReadAllText(manifestPath));
        var modOutputDirectory = Path.Combine(modOutputRootDirectory, manifest.uniqueName);

        Directory.Delete(modOutputDirectory, true);
        Directory.CreateDirectory(Path.Combine(modOutputDirectory));
        Directory.CreateDirectory(Path.Combine(modOutputDirectory, "assetbundles"));
        foreach (var path in Directory.EnumerateFiles(assetBundleDirectory))
        {
            var name = Path.GetFileName(path);
            Copy(Path.Combine(assetBundleDirectory, name), Path.Combine(modOutputDirectory, "assetbundles", name));
        }
        foreach (var path in Directory.EnumerateFiles(rootDirectory))
        {
            var name = Path.GetFileName(path);
            if (name.EndsWith(manifest.filename) || name == "default-config.json" || name == "manifest.json")
            {
                Copy(Path.Combine(rootDirectory, name), Path.Combine(modOutputDirectory, name));
            }
        }
        Directory.CreateDirectory(Path.Combine(modOutputDirectory, "planets"));
        foreach (var path in Directory.EnumerateFiles(Path.Combine(rootDirectory, "planets")))
        {
            var name = Path.GetFileName(path);
            Copy(Path.Combine(Path.Combine(rootDirectory, "planets"), name), Path.Combine(modOutputDirectory, "planets", name));
        }
        Directory.CreateDirectory(Path.Combine(modOutputDirectory, "planets/towers"));
        foreach (var path in Directory.EnumerateFiles(Path.Combine(rootDirectory, "planets/towers")))
        {
            var name = Path.GetFileName(path);
            Copy(Path.Combine(Path.Combine(rootDirectory, "planets/towers"), name), Path.Combine(modOutputDirectory, "planets/towers", name));
        }
        Directory.CreateDirectory(Path.Combine(modOutputDirectory, "systems"));
        foreach (var path in Directory.EnumerateFiles(Path.Combine(rootDirectory, "systems")))
        {
            var name = Path.GetFileName(path);
            Copy(Path.Combine(Path.Combine(rootDirectory, "systems"), name), Path.Combine(modOutputDirectory, "systems", name));
        }
    }

    static void Copy(string src, string dest)
    {
        Debug.Log("Copying " + src + " to " + dest);
        File.Copy(src, dest, true);
    }

    [MenuItem("Generate/Coordinate Assets")]
    static void GenerateCoordinateAssets()
    {
        var shader = Shader.Find("Custom/Sigil");
        var rootPath = "Assets/Mod Assets/Textures/Coordinates";
        Directory.CreateDirectory(Path.Combine(rootPath, "Materials/"));
        Directory.CreateDirectory(Path.Combine(rootPath, "Objects/"));
        var texturePaths = AssetDatabase.FindAssets("t:Texture2D", new[] { rootPath }).Select(guid => AssetDatabase.GUIDToAssetPath(guid));
        foreach (var texPath in texturePaths)
        {
            var name = Path.GetFileNameWithoutExtension(texPath);
            var mat = new Material(shader);
            mat.mainTexture = AssetDatabase.LoadAssetAtPath<Texture2D>(texPath);
            mat.color = new Color32(0x95, 0x80, 0xFF, 0xFF);
            mat.SetFloat("_NoiseScale", 8f);
            mat.SetFloat("_TimeScale", 0.25f);
            var matPath = Path.Combine(rootPath, "Materials/", name + ".mat");
            AssetDatabase.CreateAsset(mat, matPath);
            var go = GameObject.CreatePrimitive(PrimitiveType.Quad);
            GameObject.DestroyImmediate(go.GetComponent<MeshCollider>());
            go.GetComponent<MeshRenderer>().sharedMaterial = mat;
            var goPath = Path.Combine(rootPath, "Objects/", name + ".prefab");
            PrefabUtility.SaveAsPrefabAsset(go, goPath);
            AssetImporter.GetAtPath(goPath).SetAssetBundleNameAndVariant("puzzleship", null);
            
        }
    }

    [System.Serializable]
    public class ManifestJson
    {
        public string filename;
        public string author;
        public string name;
        public string uniqueName;
        public string version;
        public string owmlVersion;
        public List<string> dependencies;
    }
}

﻿using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using UnityEditor;
using UnityEngine;
using UnityEngine.UIElements;

// Create a new type of Settings Asset.
class OuterWildsSettings : ScriptableObject
{
    public const string k_OWSettingsPath = "Assets/Editor/OuterWildsSettings.asset";

    public string m_AssetBundleOutputPath; 
    public bool m_StartGameAfterBuild;
    public string m_GameExePath;
    public string m_ModOutputPath;

    internal static OuterWildsSettings GetOrCreateSettings()
    {
        var settings = AssetDatabase.LoadAssetAtPath<OuterWildsSettings>(k_OWSettingsPath);
        if (settings == null)
        {
            Debug.Log("Creating new settings");
            settings = ScriptableObject.CreateInstance<OuterWildsSettings>();
            AssetDatabase.CreateAsset(settings, k_OWSettingsPath);
            AssetDatabase.SaveAssets();
            // Set default settings
            settings.m_AssetBundleOutputPath = "Assets/StreamingAssets/AssetBundles";
            settings.m_StartGameAfterBuild = false;
            // Default steam game path for Outer Wilds
            settings.m_GameExePath = "C:/Program Files (x86)/Steam/steamapps/common/Outer Wilds/OuterWilds.exe";
            // Default path for the mod loader/game exe
            settings.m_GameExePath = "%APPDATA%/OuterWildsModManager/OWML/OWML.Launcher.exe";
            settings.m_ModOutputPath = "%APPDATA%/OuterWildsModManager/OWML/Mods";
        }
        return settings;
    }

    internal static SerializedObject GetSerializedSettings()
    {
        return new SerializedObject(GetOrCreateSettings());
    }
}

// Register a SettingsProvider using IMGUI for the drawing framework:
static class OuterWildsSettingsIMGUIRegister
{
    [SettingsProvider]
    public static SettingsProvider CreateOuterWildsSettingsProvider()
    {
        // First parameter is the path in the Settings window.
        // Second parameter is the scope of this setting: it only appears in the Project Settings window.
        var provider = new SettingsProvider("Project/OWIMGUISettings", SettingsScope.Project)
        {
            // By default the last token of the path is used as display name if no label is provided.
            label = "Outer Wilds Settings",
            // Create the SettingsProvider and initialize its drawing (IMGUI) function in place:
            guiHandler = (searchContext) =>
            {
                var settings = OuterWildsSettings.GetSerializedSettings();
                EditorGUILayout.Space();
                EditorGUILayout.PropertyField(settings.FindProperty("m_AssetBundleOutputPath"), new GUIContent("AssetBundle Output Path"));
                EditorGUILayout.Space();
                EditorGUILayout.HelpBox("AssetBundle Output Path is the path that the AssetBundles will be built to. \nIt can be a relative path (relative to your Assets folder) or absolute. \nIt is recommended to set it to an absolute path to where your mod loads AssetBundles from.", MessageType.Info);
                EditorGUILayout.Space();
                EditorGUILayout.PropertyField(settings.FindProperty("m_StartGameAfterBuild"), new GUIContent("Start game after build"));
                EditorGUILayout.Space();
                // If the user has selected the Start Game option, show the game exe path field
                if (settings.FindProperty("m_StartGameAfterBuild").boolValue)
                {
                    EditorGUILayout.PropertyField(settings.FindProperty("m_GameExePath"), new GUIContent("Game Executable Path"));
                    EditorGUILayout.Space();
                    EditorGUILayout.HelpBox("Game Executable Path is the path to the game/mod launcher executable. \nIt is recommended to set it to the OWML mod laumcher path.", MessageType.Info);
                }
                // Apply changes to the serializedProperty - always do this in the end of OnGUI.
                settings.ApplyModifiedProperties();
            },

            // Populate the search keywords to enable smart search filtering and label highlighting:
            keywords = new HashSet<string>(new[] { "m_AssetBundleOutputPath", "m_StartGameAfterBuild", "m_GameExePath" })
        };

        return provider;
    }
}

public class BuildAssetBundles
{
    [MenuItem("Export/Build AssetBundles")]
    static void BuildAllAssetBundles()
    {
        // Get the assetBundleDirectory path from the project settings (k_OWSettingsPath)
        var settings = OuterWildsSettings.GetOrCreateSettings();
        var assetBundleDirectory = settings.m_AssetBundleOutputPath;
        if (!Directory.Exists(Application.streamingAssetsPath))
        {
            Directory.CreateDirectory(assetBundleDirectory);
        }
        // Build the AssetBundles
        Debug.Log("Building AssetBundles to : " + assetBundleDirectory + " ...");
        BuildPipeline.BuildAssetBundles(assetBundleDirectory, BuildAssetBundleOptions.None, BuildTarget.StandaloneWindows64);
        Debug.Log("AssetBundles built !");
        // If the user has selected the Start Game option, start the game
        if (settings.m_StartGameAfterBuild)
        {
            var gameExePath = settings.m_GameExePath;
            // Replace the %APPDATA% token with the correct path
            gameExePath = gameExePath.Replace("%APPDATA%", Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData));
            // Start the game
            Debug.Log("Starting game at : " + gameExePath + " ...");
            System.Diagnostics.Process.Start(gameExePath);
        }
    }
}

public class BuildModFiles
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

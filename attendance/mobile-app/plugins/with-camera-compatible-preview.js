const { withDangerousMod } = require('expo/config-plugins');
const fs = require('node:fs/promises');
const path = require('node:path');

const CAMERA_VIEW_RELATIVE_PATH = path.join(
  'node_modules',
  'expo-camera',
  'android',
  'src',
  'main',
  'java',
  'expo',
  'modules',
  'camera',
  'ExpoCameraView.kt'
);

module.exports = function withCameraCompatiblePreview(config) {
  return withDangerousMod(config, [
    'android',
    async (modConfig) => {
      const cameraViewPath = path.join(modConfig.modRequest.projectRoot, CAMERA_VIEW_RELATIVE_PATH);
      const source = await fs.readFile(cameraViewPath, 'utf8');
      const defaultPreview = 'private var previewView = PreviewView(context).apply {\n    elevation = 0f\n  }';
      const compatiblePreview = 'private var previewView = PreviewView(context).apply {\n    implementationMode = PreviewView.ImplementationMode.COMPATIBLE\n    elevation = 0f\n  }';

      if (source.includes(compatiblePreview)) return modConfig;
      if (!source.includes(defaultPreview)) {
        throw new Error(`Could not locate the expected expo-camera PreviewView block in ${cameraViewPath}`);
      }

      await fs.writeFile(cameraViewPath, source.replace(defaultPreview, compatiblePreview), 'utf8');
      return modConfig;
    },
  ]);
};

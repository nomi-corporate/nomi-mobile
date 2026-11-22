const { withProjectBuildGradle } = require('@expo/config-plugins');

// Keeps native build paths short on Windows: the React Native CMake/Ninja
// toolchain still fails on paths longer than 260 characters. Used together with
// scripts/run-android-local.ps1, which builds from the short mirror C:\n.
const marker = '// nomi:windows-short-build-paths';
const block = `
${marker}
subprojects { subproject ->
  if (System.getProperty('os.name').toLowerCase().contains('windows') &&
      ["app", "react-native-reanimated", "react-native-worklets"].contains(subproject.name)) {
    subproject.buildDir = file("C:/nomi-native-build/\${subproject.name}")
  }
}

gradle.projectsEvaluated {
  subprojects { subproject ->
    if (["react-native-reanimated", "react-native-worklets"].contains(subproject.name)) {
      subproject.android.defaultConfig.externalNativeBuild.cmake.arguments("-DCMAKE_OBJECT_PATH_MAX=128")
    }
  }
}
`;

module.exports = function withWindowsShortBuildPaths(config) {
  return withProjectBuildGradle(config, (modConfig) => {
    if (modConfig.modResults.language !== 'groovy') {
      throw new Error('withWindowsShortBuildPaths supports the Groovy build.gradle template.');
    }
    if (!modConfig.modResults.contents.includes(marker)) {
      modConfig.modResults.contents += block;
    }
    return modConfig;
  });
};

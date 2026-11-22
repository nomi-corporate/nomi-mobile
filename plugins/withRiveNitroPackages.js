const { withMainApplication } = require('@expo/config-plugins');

const imports = [
  'import com.margelo.nitro.NitroModulesPackage',
  'import com.rive.RivePackage',
];

module.exports = function withRiveNitroPackages(config) {
  return withMainApplication(config, (modConfig) => {
    if (modConfig.modResults.language !== 'kt') {
      throw new Error('withRiveNitroPackages supports the Kotlin MainApplication template.');
    }

    let source = modConfig.modResults.contents;
    for (const statement of imports) {
      if (!source.includes(statement)) {
        source = source.replace('import com.facebook.react.PackageList', `${statement}\nimport com.facebook.react.PackageList`);
      }
    }

    const packageList = /PackageList\(this\)\.packages\.apply\s*\{/;
    if (!packageList.test(source)) {
      throw new Error('Could not find PackageList in MainApplication.kt.');
    }

    if (!source.includes('add(NitroModulesPackage())')) {
      source = source.replace(packageList, (match) => `${match}\n          if (none { it is NitroModulesPackage }) add(NitroModulesPackage())\n          if (none { it is RivePackage }) add(RivePackage())`);
    }

    modConfig.modResults.contents = source;
    return modConfig;
  });
};

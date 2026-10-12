// Xcode 27 refuses to build a pod target whose minimum iOS is below what it
// supports: Sentry, RNSVG and ReachabilitySwift ship resource bundles set to
// iOS 11–12.4. After the pods are installed, any pod target set below the app's
// own minimum is raised to it. Nothing is ever lowered, and app code is untouched.
const fs = require("fs");
const path = require("path");

const MARK = "# kinship: pod deployment target";

const SNIPPET = `    ${MARK}
    app_min = podfile_properties['ios.deploymentTarget'] || '15.1'
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |build_config|
        current = build_config.build_settings['IPHONEOS_DEPLOYMENT_TARGET']
        if current && Gem::Version.new(current) < Gem::Version.new(app_min)
          build_config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = app_min
        end
      end
    end
`;

function addPodDeploymentTarget(podfile) {
  if (podfile.includes(MARK)) return podfile;
  const anchor = /post_install do \|installer\|\n/;
  if (!anchor.test(podfile)) {
    throw new Error("withPodDeploymentTarget: the Podfile has no post_install block");
  }
  return podfile.replace(anchor, (line) => line + SNIPPET);
}

function withPodDeploymentTarget(config) {
  const { withDangerousMod } = require("expo/config-plugins");
  return withDangerousMod(config, [
    "ios",
    (cfg) => {
      const file = path.join(cfg.modRequest.platformProjectRoot, "Podfile");
      fs.writeFileSync(file, addPodDeploymentTarget(fs.readFileSync(file, "utf8")));
      return cfg;
    },
  ]);
}

module.exports = withPodDeploymentTarget;
module.exports.addPodDeploymentTarget = addPodDeploymentTarget;

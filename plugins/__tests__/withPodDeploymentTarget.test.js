const { describe, expect, it } = require("@jest/globals");
const { addPodDeploymentTarget } = require("../withPodDeploymentTarget");

const PODFILE = `target 'Kinship' do
  post_install do |installer|
    react_native_post_install(
      installer,
      config[:reactNativePath],
      :mac_catalyst_enabled => false,
    )
  end
end
`;

describe("withPodDeploymentTarget", () => {
  it("raises low pod targets at the start of post_install, before React Native's own hook", () => {
    const out = addPodDeploymentTarget(PODFILE);
    expect(out).toContain("app_min = podfile_properties['ios.deploymentTarget'] || '15.1'");
    expect(out.indexOf("installer.pods_project.targets.each")).toBeLessThan(out.indexOf("react_native_post_install("));
    expect(out).toContain("Gem::Version.new(current) < Gem::Version.new(app_min)");
  });

  it("is applied once, however often prebuild runs", () => {
    const once = addPodDeploymentTarget(PODFILE);
    expect(addPodDeploymentTarget(once)).toBe(once);
  });

  it("fails loudly when the Podfile has no post_install block", () => {
    expect(() => addPodDeploymentTarget("target 'Kinship' do\nend\n")).toThrow(/no post_install block/);
  });
});

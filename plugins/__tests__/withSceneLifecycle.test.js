const { describe, expect, it } = require("@jest/globals");
const { addSceneLifecycle, addSceneManifest } = require("../withSceneLifecycle");

// Expo SDK 54's generated AppDelegate.swift, trimmed to what the plugin touches.
const APP_DELEGATE = `import Expo
import React
import ReactAppDependencyProvider

@UIApplicationMain
public class AppDelegate: ExpoAppDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ExpoReactNativeFactoryDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  public override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    let delegate = ReactNativeDelegate()
    let factory = ExpoReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory
    bindReactNativeFactory(factory)

#if os(iOS) || os(tvOS)
    window = UIWindow(frame: UIScreen.main.bounds)
    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: launchOptions)
#endif

    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }
}
`;

describe("withSceneLifecycle", () => {
  it("declares one window scene whose delegate is the app's SceneDelegate", () => {
    const plist = addSceneManifest({ CFBundleName: "Kinship" });
    expect(plist.CFBundleName).toBe("Kinship");
    expect(plist.UIApplicationSceneManifest.UIApplicationSupportsMultipleScenes).toBe(false);
    const [scene] = plist.UIApplicationSceneManifest.UISceneConfigurations.UIWindowSceneSessionRoleApplication;
    expect(scene.UISceneDelegateClassName).toBe("$(PRODUCT_MODULE_NAME).SceneDelegate");
  });

  it("starts React Native in the scene's window, not one made at launch", () => {
    const out = addSceneLifecycle(APP_DELEGATE);
    expect(out).not.toContain("UIWindow(frame: UIScreen.main.bounds)");
    expect(out).toContain("class SceneDelegate: UIResponder, UIWindowSceneDelegate");
    expect(out).toContain("UIWindow(windowScene: windowScene)");
    expect(out).toContain("appDelegate.window = window");
    expect(out.match(/factory\.startReactNative\(/g)).toHaveLength(1);
    expect(out).toContain("self.launchOptions = launchOptions");
  });

  it("hands links that arrive through the scene to the AppDelegate's handlers", () => {
    const out = addSceneLifecycle(APP_DELEGATE);
    expect(out).toContain("openURLContexts");
    expect(out).toContain("appDelegate.application(UIApplication.shared, open: context.url, options: options)");
    expect(out).toContain("launchOptions[.url] = url");
    expect(out).toContain("continue: userActivity");
  });

  it("is applied once, however often prebuild runs", () => {
    const once = addSceneLifecycle(APP_DELEGATE);
    expect(addSceneLifecycle(once)).toBe(once);
  });

  it("fails loudly when Expo's AppDelegate no longer has the shape it patches", () => {
    expect(() => addSceneLifecycle("public class AppDelegate {}\n")).toThrow(/no longer starts React Native/);
  });
});

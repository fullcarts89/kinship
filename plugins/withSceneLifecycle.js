// iOS 27 refuses to launch an app built with its SDK unless the app adopts the
// UIScene life cycle ("UIScene life cycle is required for apps built with this
// SDK", N11). Expo SDK 54's AppDelegate starts React Native in a window it makes
// itself at launch. This plugin declares one window scene and moves only that
// step into a SceneDelegate: the scene's window gets the same React Native
// start, and links that arrive through the scene go to the AppDelegate's own
// Linking handlers. The app delegate keeps the window as `window`, which
// expo-system-ui and expo-updates read. Nothing else in the app changes.
const MARK = "// kinship: UIScene life cycle";

const START = `#if os(iOS) || os(tvOS)
    window = UIWindow(frame: UIScreen.main.bounds)
    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: launchOptions)
#endif`;

const DEFERRED = `    ${MARK}: React Native starts in SceneDelegate, in the scene's window.
    self.launchOptions = launchOptions`;

const SCENE_DELEGATE = `
${MARK}
class SceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?

  func scene(
    _ scene: UIScene,
    willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions
  ) {
    guard let windowScene = scene as? UIWindowScene,
          let appDelegate = UIApplication.shared.delegate as? AppDelegate,
          let factory = appDelegate.reactNativeFactory else { return }

    var launchOptions = appDelegate.launchOptions ?? [:]
    if let url = connectionOptions.urlContexts.first?.url {
      launchOptions[.url] = url
    }

    let window = UIWindow(windowScene: windowScene)
    self.window = window
    appDelegate.window = window
    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: launchOptions)

    if let activity = connectionOptions.userActivities.first {
      self.scene(scene, continue: activity)
    }
  }

  func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
    guard let appDelegate = UIApplication.shared.delegate as? AppDelegate else { return }
    for context in URLContexts {
      var options: [UIApplication.OpenURLOptionsKey: Any] = [:]
      options[.sourceApplication] = context.options.sourceApplication
      options[.annotation] = context.options.annotation
      options[.openInPlace] = context.options.openInPlace
      _ = appDelegate.application(UIApplication.shared, open: context.url, options: options)
    }
  }

  func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
    guard let appDelegate = UIApplication.shared.delegate as? AppDelegate else { return }
    _ = appDelegate.application(UIApplication.shared, continue: userActivity, restorationHandler: { _ in })
  }
}
`;

function addSceneLifecycle(source) {
  if (source.includes(MARK)) return source;
  if (!source.includes(START)) {
    throw new Error("withSceneLifecycle: AppDelegate.swift no longer starts React Native the way Expo SDK 54 does");
  }
  const anchor = "  var reactNativeFactory: RCTReactNativeFactory?\n";
  if (!source.includes(anchor)) {
    throw new Error("withSceneLifecycle: AppDelegate.swift has no reactNativeFactory property");
  }
  return (
    source
      .replace(anchor, `${anchor}  var launchOptions: [UIApplication.LaunchOptionsKey: Any]?\n`)
      .replace(START, DEFERRED) + SCENE_DELEGATE
  );
}

function addSceneManifest(plist) {
  return {
    ...plist,
    UIApplicationSceneManifest: {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          {
            UISceneConfigurationName: "Default Configuration",
            UISceneDelegateClassName: "$(PRODUCT_MODULE_NAME).SceneDelegate",
          },
        ],
      },
    },
  };
}

function withSceneLifecycle(config) {
  const { withAppDelegate, withInfoPlist } = require("expo/config-plugins");
  config = withInfoPlist(config, (cfg) => {
    cfg.modResults = addSceneManifest(cfg.modResults);
    return cfg;
  });
  return withAppDelegate(config, (cfg) => {
    if (cfg.modResults.language !== "swift") {
      throw new Error("withSceneLifecycle: expected a Swift AppDelegate");
    }
    cfg.modResults.contents = addSceneLifecycle(cfg.modResults.contents);
    return cfg;
  });
}

module.exports = withSceneLifecycle;
module.exports.addSceneLifecycle = addSceneLifecycle;
module.exports.addSceneManifest = addSceneManifest;

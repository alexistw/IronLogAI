import UIKit
import Capacitor

class SceneDelegate: UIResponder, UIWindowSceneDelegate {

    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        // UIKit creates the window and the CAPBridgeViewController root from the storyboard named
        // in the scene configuration, so only the launch-time payloads need forwarding here.
        for context in connectionOptions.urlContexts {
            _ = ApplicationDelegateProxy.shared.application(UIApplication.shared, open: context.url, options: openURLOptions(for: context))
        }

        for userActivity in connectionOptions.userActivities {
            _ = ApplicationDelegateProxy.shared.application(UIApplication.shared, continue: userActivity, restorationHandler: { _ in })
        }
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        // Called when the app is opened with a url while already running. Keep the proxy call so
        // the App API can keep tracking app url opens.
        for context in URLContexts {
            _ = ApplicationDelegateProxy.shared.application(UIApplication.shared, open: context.url, options: openURLOptions(for: context))
        }
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        // Called when the app continues an activity, including Universal Links.
        _ = ApplicationDelegateProxy.shared.application(UIApplication.shared, continue: userActivity, restorationHandler: { _ in })
    }

    /// Translates the scene-based open URL options into the app-delegate shape that Capacitor's proxy expects.
    private func openURLOptions(for context: UIOpenURLContext) -> [UIApplication.OpenURLOptionsKey: Any] {
        var options: [UIApplication.OpenURLOptionsKey: Any] = [.openInPlace: context.options.openInPlace]
        if let sourceApplication = context.options.sourceApplication {
            options[.sourceApplication] = sourceApplication
        }
        if let annotation = context.options.annotation {
            options[.annotation] = annotation
        }
        return options
    }

}

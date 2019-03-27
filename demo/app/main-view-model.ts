import { getDevicePushToken, setNotificationHandler } from "nativescript-pushy";
import { Observable } from "tns-core-modules/data/observable";
import { alert } from "tns-core-modules/ui/dialogs";

export class HelloWorldModel extends Observable {
  public message: string;

  constructor() {
    super();

    setNotificationHandler(notification => {
      console.log(`Notification received: ${JSON.stringify(notification)}`);

      setTimeout(() => {
        alert({
          title: "Notification received",
          message: JSON.stringify(notification),
          okButtonText: "OK"
        });
      }, 500);
    });
  }

  public doGetDevicePushToken(): void {
    getDevicePushToken()
        .then(token => {
          console.log(`getDevicePushToken success, token: ${token}`);
          this.set("message", "token: " + token);
        })
        .catch(err => this.set("message", err));
  }
}

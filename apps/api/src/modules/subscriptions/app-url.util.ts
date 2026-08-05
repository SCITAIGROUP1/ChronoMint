import { appOrigin } from "../../common/mailer/app-origin.util";

export function resolvePublicAppUrl(): string {
  return appOrigin();
}

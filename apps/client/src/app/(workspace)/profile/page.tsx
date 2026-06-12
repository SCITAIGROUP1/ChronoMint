import { ProfilePage } from "@kloqra/web-shared";
import { JiraAccountSection } from "@/features/jira/jira-account-section";

export default function Page() {
  return (
    <ProfilePage
      extraTabs={[
        { value: "integrations", label: "Integrations", content: <JiraAccountSection /> }
      ]}
    />
  );
}

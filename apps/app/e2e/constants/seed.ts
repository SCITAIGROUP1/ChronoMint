export const SEED = {
  tenant: { name: "Kloqra Demo Organization", slug: "kloqra-demo" },
  workspaces: {
    acme: { name: "Acme Corporation", slug: "acme" },
    meridian: { name: "Meridian Product Co", slug: "meridian" }
  },
  projects: {
    acme: {
      clientPortalRedesign: { name: "Client Portal Redesign", clientName: "Northwind Traders" },
      brandCampaignQ2: { name: "Brand Campaign Q2" },
      supportRetainer: { name: "Support Retainer", clientName: "Contoso Retail" }
    }
  },
  categories: { softwareDevelopment: "Software Development" },
  personas: {
    tenantOwner: { email: "admin@kloqra.dev", name: "Avery Org Owner", password: "password123" },
    tenantAdmin: { email: "ops@kloqra.dev", name: "Morgan Org Admin", password: "password123" },
    acmeAdmin: {
      email: "acme-admin@kloqra.dev",
      name: "Casey Acme Admin",
      password: "password123"
    },
    member: { email: "member@kloqra.dev", name: "Sam Rivera", password: "password123" },
    individualContributor: {
      email: "taylor@kloqra.dev",
      name: "Taylor Brooks",
      password: "password123"
    },
    drew: { email: "drew@kloqra.dev", name: "Drew", password: "password123" }
  }
} as const;

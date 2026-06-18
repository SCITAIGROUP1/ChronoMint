export function buildWidgetShareDateRange(startDate: string, endDate: string) {
  const from = new Date(`${startDate}T00:00:00`);
  const to = new Date(`${endDate}T23:59:59.999`);
  return { from: from.toISOString(), to: to.toISOString() };
}

export function widgetShareOptionsForId(
  widgetId: string,
  state: {
    dailyChartBy: string;
    breakdownGroupBy: string;
    distributionGroupBy: string;
  }
): Record<string, unknown> | undefined {
  switch (widgetId) {
    case "daily_chart":
      return { chartBy: state.dailyChartBy };
    case "breakdown_table":
      return { groupBy: state.breakdownGroupBy };
    case "distribution_donut":
      return { groupBy: state.distributionGroupBy };
    case "category_distribution":
    case "category_breakdown":
      return { groupBy: "category" };
    default:
      return undefined;
  }
}

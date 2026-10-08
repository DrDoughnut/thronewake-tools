/** Shown in place of the Operation Planner while it is switched off. */
export function PlannerOffline() {
  return (
    <main className="app__body planner-offline">
      <section className="panel planner-offline__panel" role="status">
        <h2 className="planner-offline__title">Temporarily down</h2>
        <p className="planner-offline__text">The Operation Planner is unavailable right now. Please check back later.</p>
      </section>
    </main>
  );
}

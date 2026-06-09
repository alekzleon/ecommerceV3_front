import "./DashboardPage.css"

const kpis = [
  {
    title: "Pedidos",
    value: "680.00",
    color: "is-red",
  },
  {
    title: "Operación",
    value: "170.00",
    color: "is-orange",
  },
  {
    title: "Clientes nuevos",
    value: "280.00",
    color: "is-cyan",
  },
  {
    title: "Ingresos",
    value: "$ 1286.00",
    color: "is-blue",
  },
]

const recentOrders = [
  {
    name: "Ana López",
    product: "Refrescos y bebidas",
    date: "18/04/2026",
    status: "Pagado",
  },
  {
    name: "Carlos Méndez",
    product: "Abarrotes",
    date: "21/04/2026",
    status: "Pendiente",
  },
  {
    name: "Mariana Ruiz",
    product: "Limpieza",
    date: "24/04/2026",
    status: "Pagado",
  },
  {
    name: "Jorge Castillo",
    product: "Snacks",
    date: "26/04/2026",
    status: "Pagado",
  },
]

const team = [
  {
    name: "Alejandro León",
    role: "Administrador",
    status: "Disponible",
  },
  {
    name: "Karina Soto",
    role: "Ventas",
    status: "Disponible",
  },
  {
    name: "Diego Ruiz",
    role: "Almacén",
    status: "Ausente",
  },
  {
    name: "Fernanda Pérez",
    role: "Cobranza",
    status: "Disponible",
  },
]

function DashboardPage() {
  return (
    <div className="dashboard-page">
      <section className="dashboard-page__kpis">
        {kpis.map((item) => (
          <article className="dashboard-widget dashboard-widget--kpi" key={item.title}>
            <div className={`dashboard-widget__badge ${item.color}`}>◉</div>

            <div className="dashboard-widget__kpi-content">
              <p className="dashboard-widget__label">{item.title}</p>
              <h3 className="dashboard-widget__amount">{item.value}</h3>
            </div>

            <div className="dashboard-widget__sparkline">
              <span />
              <span />
              <span />
              <span />
              <span />
            </div>
          </article>
        ))}
      </section>

      <section className="dashboard-page__middle">
        <article className="dashboard-widget dashboard-widget--chart">
          <div className="dashboard-widget__header">
            <div>
              <h3 className="dashboard-widget__title">Resumen comercial</h3>
              <div className="dashboard-widget__legend">
                <span><i className="dot dot-blue" /> Nuevos clientes</span>
                <span><i className="dot dot-red" /> Pedidos</span>
              </div>
            </div>

            <button type="button" className="dashboard-widget__ghost-button">
              10 - 16 Apr - 2026
            </button>
          </div>

          <div className="dashboard-chart dashboard-chart--lines">
            <div className="dashboard-chart__grid" />
            <div className="dashboard-chart__line dashboard-chart__line--blue" />
            <div className="dashboard-chart__line dashboard-chart__line--red" />
          </div>
        </article>

        <article className="dashboard-widget dashboard-widget--source">
          <div className="dashboard-widget__header">
            <div>
              <h3 className="dashboard-widget__title">Categorías activas</h3>
              <div className="dashboard-widget__legend">
                <span><i className="dot dot-blue" /> Abarrotes</span>
                <span><i className="dot dot-cyan" /> Bebidas</span>
                <span><i className="dot dot-purple" /> Limpieza</span>
              </div>
            </div>

            <button type="button" className="dashboard-widget__ghost-button">
              10 - 16 Apr - 2026
            </button>
          </div>

          <div className="dashboard-chart dashboard-chart--bars">
            <div className="bar-group"><span /><span /><span /></div>
            <div className="bar-group"><span /><span /><span /></div>
            <div className="bar-group"><span /><span /><span /></div>
            <div className="bar-group"><span /><span /><span /></div>
            <div className="bar-group"><span /><span /><span /></div>
            <div className="bar-group"><span /><span /><span /></div>
          </div>
        </article>
      </section>

      <section className="dashboard-page__bottom">
        <article className="dashboard-widget dashboard-widget--table">
          <div className="dashboard-widget__header">
            <div>
              <h3 className="dashboard-widget__title">Últimos pedidos</h3>
            </div>

            <button type="button" className="dashboard-widget__icon-button">
              ⋮
            </button>
          </div>

          <div className="dashboard-table">
            <div className="dashboard-table__head">
              <span>Cliente</span>
              <span>Producto</span>
              <span>Fecha</span>
              <span>Estatus</span>
              <span>Acciones</span>
            </div>

            <div className="dashboard-table__body">
              {recentOrders.map((item, index) => (
                <div className="dashboard-table__row" key={`${item.name}-${index}`}>
                  <div className="dashboard-person">
                    <div className="dashboard-person__avatar">
                      {item.name.charAt(0)}
                    </div>
                    <span>{item.name}</span>
                  </div>

                  <span>{item.product}</span>
                  <span>{item.date}</span>

                  <span
                    className={`dashboard-status ${
                      item.status === "Pagado" ? "is-paid" : "is-pending"
                    }`}
                  >
                    {item.status}
                  </span>

                  <div className="dashboard-row-actions">
                    <button type="button">✎</button>
                    <button type="button" className="is-danger">⌫</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </article>

        <article className="dashboard-widget dashboard-widget--team">
          <div className="dashboard-widget__header">
            <div>
              <h3 className="dashboard-widget__title">Equipo</h3>
            </div>

            <button type="button" className="dashboard-widget__icon-button">
              ⋮
            </button>
          </div>

          <div className="dashboard-team">
            {team.map((item, index) => (
              <div className="dashboard-team__item" key={`${item.name}-${index}`}>
                <div className="dashboard-person">
                  <div className="dashboard-person__avatar">
                    {item.name.charAt(0)}
                  </div>

                  <div className="dashboard-person__meta">
                    <strong>{item.name}</strong>
                    <small>{item.role}</small>
                  </div>
                </div>

                <span
                  className={`dashboard-team__status ${
                    item.status === "Disponible" ? "is-available" : "is-away"
                  }`}
                >
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  )
}

export default DashboardPage
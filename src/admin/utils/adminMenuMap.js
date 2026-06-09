const adminMenuMap = [
  {
    module: "dashboard",
    path: "/admin",
    title: "Dashboard",
    subtitle: "Resumen general del panel administrativo.",
  },
  {
    module: "usuarios",
    path: "/admin/users",
    title: "Usuarios",
    subtitle: "Gestiona los usuarios internos y su acceso.",
  },
  {
    module: "roles",
    path: "/admin/roles",
    title: "Roles",
    subtitle: "Administra roles y módulos permitidos.",
  },
  {
    module: "productos",
    path: "/admin/products",
    title: "Productos",
    subtitle: "Controla el catálogo y la información comercial.",
  },
  {
    module: "pedidos",
    path: "/admin/orders",
    title: "Pedidos",
    subtitle: "Consulta y da seguimiento a los pedidos.",
  },
  {
    module: "clientes",
    path: "/admin/customers",
    title: "Clientes",
    subtitle: "Gestiona la información de clientes.",
  },
  {
    module: "credito",
    path: "/admin/credit",
    title: "Crédito",
    subtitle: "Administra crédito y validaciones financieras.",
  },
  {
    module: "cobranza",
    path: "/admin/collections",
    title: "Cobranza",
    subtitle: "Da seguimiento a cartera, cobros y movimientos.",
  },
  {
    module: "marketing",
    path: "/admin/marketing",
    title: "Marketing",
    subtitle: "Gestiona la parte comercial y visual.",
  },
  {
    module: "promociones",
    path: "/admin/promotions",
    title: "Promociones",
    subtitle: "Controla promociones, ofertas y banners.",
  },
  {
    module: "logs",
    path: "/admin/logs",
    title: "Logs",
    subtitle: "Consulta los registros del sistema.",
  },
  {
    module: "sincronizacion",
    path: "/admin/sync",
    title: "Sincronización",
    subtitle: "Supervisa procesos y tareas de sincronización.",
  },
  {
    module: "configuracion_ecommerce",
    path: "/admin/settings",
    title: "Configuración",
    subtitle: "Ajustes generales del ecommerce.",
  },
]

export default adminMenuMap
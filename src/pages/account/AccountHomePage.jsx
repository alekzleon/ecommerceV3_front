import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "./account.css";

const accountCards = [
  {
    id: "profile",
    title: "Mis datos",
    description:
      "Consulta tu correo, número de cliente, empresa y administra la seguridad de tu cuenta.",
    to: "/mi-cuenta/datos",
    icon: "👤",
  },
  {
    id: "addresses",
    title: "Direcciones",
    description:
      "Revisa las direcciones registradas para entrega y consulta cuál tienes como principal.",
    to: "/mi-cuenta/direcciones",
    icon: "📍",
  },
  {
    id: "orders",
    title: "Mis pedidos",
    description:
      "Consulta tus compras, productos, totales, pagos y notas del pedido.",
    to: "/mi-cuenta/pedidos",
    icon: "🧾",
  },
  {
    id: "credit",
    title: "Crédito",
    description:
      "Consulta la información de tu crédito cuando esta sección esté disponible.",
    to: "/mi-cuenta/credito",
    icon: "💳",
    badge: "Próximamente",
  },
];

function AccountHomePage() {
  const { user } = useAuth();
  const displayName = user?.name || "Cliente";
  const displayEmail = user?.email || "";
  const customerNumber = user?.customer_number || user?.id || "-";
  const company = user?.customer_profile?.commercial_name || user?.name || "-";

  return (
    <div className="account_home_page">
      <div className="account_home_shell">
        <section className="account_home_profile">
          <div className="account_home_avatar">
            <span>{displayName.charAt(0)}</span>
          </div>

          <div className="account_home_profile_info">
            <h1 className="account_home_name">{displayName}</h1>
            <p className="account_home_email">{displayEmail}</p>

            <div className="account_home_meta">
              <span className="account_home_meta_item">
                Cliente: <strong>{customerNumber}</strong>
              </span>

              <span className="account_home_meta_dot">•</span>

              <span className="account_home_meta_item">
                Empresa: <strong>{company}</strong>
              </span>
            </div>
          </div>
        </section>

        <section className="account_home_cards_grid">
          {accountCards.map((card) => (
            <Link key={card.id} to={card.to} className="account_home_card">
              <div className="account_home_card_top">
                <div className="account_home_card_icon">{card.icon}</div>

                {card.badge ? (
                  <span className="account_home_card_badge">{card.badge}</span>
                ) : null}
              </div>

              <div className="account_home_card_content">
                <h2 className="account_home_card_title">{card.title}</h2>
                <p className="account_home_card_text">{card.description}</p>
              </div>
            </Link>
          ))}
        </section>
      </div>
    </div>
  );
}

export default AccountHomePage;

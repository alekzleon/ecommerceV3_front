import Header from "../components/common/Header/Header"
import { Outlet, useLocation } from "react-router-dom"
import Footer from "../components/common/Footer/Footer"


function MainLayout() {
  const { pathname } = useLocation()
  const isFullscreenRoute = [
    "/login",
    "/registro",
    "/recuperar-password",
    "/reset-password",
  ].includes(pathname)

  return (
    <>
      {!isFullscreenRoute ? <Header /> : null}

      <main>
        <Outlet />
      </main>

      {!isFullscreenRoute ? <Footer /> : null}
    </>
  )
}

export default MainLayout

import HeroBanner from "../../components/home/HeroBanner/HeroBanner"
import HomeHighlights from "../../components/home/HomeHighlights/HomeHighlights"
import LatestPurchases from "../../components/home/LatestPurchases/LatestPurchases"
import MonthlyPromotions from "../../components/home/MonthlyPromotions/MonthlyPromotions"
import OffersSection from "../../components/home/OffersSection/OffersSection"


function HomePage() {
  return (
    <>
      <HeroBanner />
      <HomeHighlights />
      <LatestPurchases />
      <MonthlyPromotions />
      <OffersSection />
    </>
  )
}

export default HomePage
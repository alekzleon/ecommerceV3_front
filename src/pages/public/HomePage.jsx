import HeroBanner from "../../components/home/HeroBanner/HeroBanner"
import BrandBanners from "../../components/home/BrandBanners/BrandBanners"
import LatestPurchases from "../../components/home/LatestPurchases/LatestPurchases"
import MonthlyPromotions from "../../components/home/MonthlyPromotions/MonthlyPromotions"
import OffersSection from "../../components/home/OffersSection/OffersSection"


function HomePage() {
  return (
    <>
      <HeroBanner />
      <BrandBanners />
      <LatestPurchases source="favorites" />
      <LatestPurchases />
      <MonthlyPromotions />
      <OffersSection />
    </>
  )
}

export default HomePage

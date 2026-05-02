import { galleriesUrl } from "@/lib/storage-image";
import type { GalleryImage } from "./gallery-projects";

function createGalleryImages(paths: string[], projectName: string): GalleryImage[] {
  return paths.map((path) => ({
    src: galleriesUrl(path),
    alt: `${projectName} event environment by Eclectic Hive`,
  }));
}

export const amangiriGalleryPaths = [
  "AMANGIRI/18A2F936-BF79-4B89-85B5-CD4A21DEF869.jpeg",
  "AMANGIRI/3123EA4B-F726-4905-8E0A-D4B72CFE124F.jpeg",
  "AMANGIRI/39503C36-4ACA-4044-8769-4C6A3A54024A.jpeg",
  "AMANGIRI/3E9A02E2-E2B5-48CD-ADD1-CA72696EB7ED.jpeg",
  "AMANGIRI/4AD5F098-D518-4F88-BF74-DD99FB94F7C6.jpeg",
  "AMANGIRI/4D7CEAAF-3AB9-4FDE-8816-3E2F48884B2F.jpeg",
  "AMANGIRI/52F22DC9-772E-4E6C-AC83-A410C9872E57.jpeg",
  "AMANGIRI/7D28AF40-82DD-44AE-B61F-09E6B70710E8.jpeg",
  "AMANGIRI/876CAB81-E83E-4D52-9C11-A7324AE6D3D5.jpeg",
  "AMANGIRI/8D3495B8-561D-4F8C-BA93-EE46B40063ED.jpeg",
  "AMANGIRI/923B893B-128A-4F0F-B4D7-2A1FD93D42B7.jpeg",
  "AMANGIRI/98171ECC-C860-4911-BC61-6FD36A14E85E.jpeg",
  "AMANGIRI/9D0CDD36-2379-485A-95AC-D1002BB7270D.jpeg",
  "AMANGIRI/9E9035E0-E84F-4079-B303-B815CC5F99F9.jpeg",
  "AMANGIRI/A4B28427-D41D-4FE6-94E5-D96D5EAE6C65.jpeg",
  "AMANGIRI/AD86EF2A-10FA-4656-938D-5001FF32CC0E.jpeg",
  "AMANGIRI/ADD On Bar 2.jpg",
  "AMANGIRI/ADD ON Bar.jpg",
  "AMANGIRI/ADD ON Close Up Lounge.jpg",
  "AMANGIRI/ADD ON Close Up.jpg",
  "AMANGIRI/ADD ON Lounge + floral.jpg",
  "AMANGIRI/ADD ON Lounge.jpg",
  "AMANGIRI/ADD ON Petite Lounge.jpg",
  "AMANGIRI/ADD ON Welcome.jpg",
  "AMANGIRI/C631CFB9-BE43-465B-BB80-0AEF41D4210E.jpeg",
  "AMANGIRI/F48C68F1-2D4F-42FC-A6C2-16F90B2E8730.jpeg",
  "AMANGIRI/F756DB53-AEA0-48F7-87F5-6A65E580DCA9.jpeg",
] as const;

export const amangiriGalleryHero: GalleryImage = {
  src: galleriesUrl("AMANGIRI/C631CFB9-BE43-465B-BB80-0AEF41D4210E.jpeg"),
  alt: "Concrete console with sculptural vessels in the Amangiri desert",
};

export const amangiriGalleryImages = createGalleryImages([...amangiriGalleryPaths], "Amangiri");

export const aspenEventWorksGalleryPaths = [
  "ASPEN-EVENT-WORKS-ASPEN-PRIVATE-RANCH/Bride and her horse 2.jpg",
  "ASPEN-EVENT-WORKS-ASPEN-PRIVATE-RANCH/Bride and her horse.jpg",
  "ASPEN-EVENT-WORKS-ASPEN-PRIVATE-RANCH/Bride at Night B+W.jpg",
  "ASPEN-EVENT-WORKS-ASPEN-PRIVATE-RANCH/Cake with a view.jpg",
  "ASPEN-EVENT-WORKS-ASPEN-PRIVATE-RANCH/Ceremony 2.jpg",
  "ASPEN-EVENT-WORKS-ASPEN-PRIVATE-RANCH/Ceremony Favorite.jpg",
  "ASPEN-EVENT-WORKS-ASPEN-PRIVATE-RANCH/Ceremony.jpg",
  "ASPEN-EVENT-WORKS-ASPEN-PRIVATE-RANCH/Champagne Tower.jpg",
  "ASPEN-EVENT-WORKS-ASPEN-PRIVATE-RANCH/Cheers B+W.jpg",
  "ASPEN-EVENT-WORKS-ASPEN-PRIVATE-RANCH/Couple 2.jpg",
  "ASPEN-EVENT-WORKS-ASPEN-PRIVATE-RANCH/Couple 3 with horse.jpg",
  "ASPEN-EVENT-WORKS-ASPEN-PRIVATE-RANCH/Couple 3.jpg",
  "ASPEN-EVENT-WORKS-ASPEN-PRIVATE-RANCH/Couple at Toast.jpg",
  "ASPEN-EVENT-WORKS-ASPEN-PRIVATE-RANCH/Couple Black and White.jpg",
  "ASPEN-EVENT-WORKS-ASPEN-PRIVATE-RANCH/Dinner Service B+W.jpg",
  "ASPEN-EVENT-WORKS-ASPEN-PRIVATE-RANCH/Escort Display.jpg",
  "ASPEN-EVENT-WORKS-ASPEN-PRIVATE-RANCH/First Dance.jpg",
  "ASPEN-EVENT-WORKS-ASPEN-PRIVATE-RANCH/Guests.jpg",
  "ASPEN-EVENT-WORKS-ASPEN-PRIVATE-RANCH/Hold Photo.png",
  "ASPEN-EVENT-WORKS-ASPEN-PRIVATE-RANCH/Horse.jpg",
  "ASPEN-EVENT-WORKS-ASPEN-PRIVATE-RANCH/Lounge Close Up.jpg",
  "ASPEN-EVENT-WORKS-ASPEN-PRIVATE-RANCH/Nature Hike.jpg",
  "ASPEN-EVENT-WORKS-ASPEN-PRIVATE-RANCH/Nighttime Tablescape.jpg",
  "ASPEN-EVENT-WORKS-ASPEN-PRIVATE-RANCH/Our Bride.jpg",
  "ASPEN-EVENT-WORKS-ASPEN-PRIVATE-RANCH/Pretty Little Details.jpg",
  "ASPEN-EVENT-WORKS-ASPEN-PRIVATE-RANCH/Seating with Views.jpg",
  "ASPEN-EVENT-WORKS-ASPEN-PRIVATE-RANCH/Stone Plates.jpg",
  "ASPEN-EVENT-WORKS-ASPEN-PRIVATE-RANCH/Tablescape Close Up 2.jpg",
  "ASPEN-EVENT-WORKS-ASPEN-PRIVATE-RANCH/Tablescape Close Up 3.jpg",
  "ASPEN-EVENT-WORKS-ASPEN-PRIVATE-RANCH/Tablescape Close Up 4.jpg",
  "ASPEN-EVENT-WORKS-ASPEN-PRIVATE-RANCH/Tablescape Close Up.jpg",
  "ASPEN-EVENT-WORKS-ASPEN-PRIVATE-RANCH/Tablescape.jpg",
  "ASPEN-EVENT-WORKS-ASPEN-PRIVATE-RANCH/Tent 2.jpg",
  "ASPEN-EVENT-WORKS-ASPEN-PRIVATE-RANCH/Tent 3.jpg",
  "ASPEN-EVENT-WORKS-ASPEN-PRIVATE-RANCH/Tent 4.jpg",
  "ASPEN-EVENT-WORKS-ASPEN-PRIVATE-RANCH/Tent at Night 2.jpg",
  "ASPEN-EVENT-WORKS-ASPEN-PRIVATE-RANCH/Tent at Night.jpg",
  "ASPEN-EVENT-WORKS-ASPEN-PRIVATE-RANCH/Tent.jpg",
  "ASPEN-EVENT-WORKS-ASPEN-PRIVATE-RANCH/Wedding Day Bride 2.jpg",
  "ASPEN-EVENT-WORKS-ASPEN-PRIVATE-RANCH/Wedding Day Bride 3.jpg",
  "ASPEN-EVENT-WORKS-ASPEN-PRIVATE-RANCH/Wedding Day Bride.jpg",
  "ASPEN-EVENT-WORKS-ASPEN-PRIVATE-RANCH/Wedding Day Couple 2.jpg",
  "ASPEN-EVENT-WORKS-ASPEN-PRIVATE-RANCH/Wedding Day Couple.jpg",
] as const;

export const aspenEventWorksGalleryHero: GalleryImage = {
  src: galleriesUrl("ASPEN-EVENT-WORKS-ASPEN-PRIVATE-RANCH/Ceremony Favorite.jpg"),
  alt: "Ceremony aisle framed by meadow flowers with mountain views beyond",
};

export const aspenEventWorksGalleryImages = createGalleryImages([...aspenEventWorksGalleryPaths], "Aspen Event Works");

export const birchDesignGalleryPaths = [
  "BIRCH-DESIGN/Antler Bar.jpg",
  "BIRCH-DESIGN/Aspen.jpg",
  "BIRCH-DESIGN/Caribou Rehearsal Dinner Close Up 2.jpg",
  "BIRCH-DESIGN/Caribou Rehearsal Dinner Tablescape 2.jpg",
  "BIRCH-DESIGN/Caribou Rehearsal Dinner Tablescape 3.jpg",
  "BIRCH-DESIGN/Disco After Party 2.jpg",
  "BIRCH-DESIGN/Disco After Party.jpg",
  "BIRCH-DESIGN/Disco Detail.jpg",
  "BIRCH-DESIGN/Disco Lounge.jpg",
  "BIRCH-DESIGN/Welcome Hat Branding.jpg",
  "BIRCH-DESIGN/Welcome Lounge Detail .jpg",
  "BIRCH-DESIGN/Welcome Party Aspen Art Museum.jpg",
] as const;

export const birchDesignGalleryHero: GalleryImage = {
  src: galleriesUrl("BIRCH-DESIGN/Caribou Rehearsal Dinner Tablescape 2.jpg"),
  alt: "Rehearsal dinner table set against a dark green wall with framed art",
};

export const birchDesignGalleryImages = createGalleryImages([...birchDesignGalleryPaths], "Birch Design Studio");

export const eastonEventsMontanaGalleryPaths = [
  "EASTON-EVENTS-MONTANA/Bride.jpg",
  "EASTON-EVENTS-MONTANA/Ceremony 3.jpg",
  "EASTON-EVENTS-MONTANA/Ceremony Chairs 2.jpg",
  "EASTON-EVENTS-MONTANA/Ceremony Chairs.jpg",
  "EASTON-EVENTS-MONTANA/Ceremony.jpg",
  "EASTON-EVENTS-MONTANA/Cocktail Hour 2.jpg",
  "EASTON-EVENTS-MONTANA/Cocktail Hour 3.jpg",
  "EASTON-EVENTS-MONTANA/Cocktail HOur.jpg",
  "EASTON-EVENTS-MONTANA/Montana 2.jpg",
  "EASTON-EVENTS-MONTANA/Montana 3.jpg",
  "EASTON-EVENTS-MONTANA/Montana.jpg",
  "EASTON-EVENTS-MONTANA/Reception 2.jpg",
  "EASTON-EVENTS-MONTANA/Reception 3.jpg",
  "EASTON-EVENTS-MONTANA/Reception 4.jpg",
  "EASTON-EVENTS-MONTANA/Reception 5.jpg",
  "EASTON-EVENTS-MONTANA/Reception 6.jpg",
  "EASTON-EVENTS-MONTANA/Reception.jpg",
  "EASTON-EVENTS-MONTANA/Tent 2.jpg",
  "EASTON-EVENTS-MONTANA/Tent 3.jpg",
  "EASTON-EVENTS-MONTANA/Tent.jpg",
  "EASTON-EVENTS-MONTANA/Wedding Lounge 2.jpg",
  "EASTON-EVENTS-MONTANA/Wedding Lounge.jpg",
  "EASTON-EVENTS-MONTANA/Welcome Alpine Party Dining.jpg",
  "EASTON-EVENTS-MONTANA/Welcome Alpine Party Lounge 2.jpg",
  "EASTON-EVENTS-MONTANA/Welcome Alpine Party Lounge 3.jpg",
  "EASTON-EVENTS-MONTANA/Welcome Alpine Party Lounge 4.jpg",
  "EASTON-EVENTS-MONTANA/Welcome Alpine Party Lounge 5.jpg",
  "EASTON-EVENTS-MONTANA/Welcome Alpine Party Lounge 6.jpg",
  "EASTON-EVENTS-MONTANA/Welcome Alpine Party Lounge 7.jpg",
  "EASTON-EVENTS-MONTANA/Welcome Alpine Party Lounge.jpg",
  "EASTON-EVENTS-MONTANA/Welcome Party.jpg",
] as const;

export const eastonEventsMontanaGalleryHero: GalleryImage = {
  src: galleriesUrl("EASTON-EVENTS-MONTANA/Tent.jpg"),
  alt: "A tented celebration in the mountain landscape at Big Sky",
};

export const eastonEventsMontanaGalleryImages = createGalleryImages([...eastonEventsMontanaGalleryPaths], "Easton Events");

export const brookeKeganDuntonGalleryPaths = [
  "JL-BROOKE-KEGAN-DUNTON-HOT-SPRINGS/MKSADLER--3.jpg",
  "JL-BROOKE-KEGAN-DUNTON-HOT-SPRINGS/MKSADLER--33.jpg",
  "JL-BROOKE-KEGAN-DUNTON-HOT-SPRINGS/MKSADLER-08565.jpg",
  "JL-BROOKE-KEGAN-DUNTON-HOT-SPRINGS/MKSADLER-08620.jpg",
  "JL-BROOKE-KEGAN-DUNTON-HOT-SPRINGS/MKSADLER-1893.jpg",
  "JL-BROOKE-KEGAN-DUNTON-HOT-SPRINGS/MKSADLER-1901.jpg",
  "JL-BROOKE-KEGAN-DUNTON-HOT-SPRINGS/MKSADLER-1905.jpg",
  "JL-BROOKE-KEGAN-DUNTON-HOT-SPRINGS/MKSADLER-1909.jpg",
  "JL-BROOKE-KEGAN-DUNTON-HOT-SPRINGS/MKSADLER-1916.jpg",
  "JL-BROOKE-KEGAN-DUNTON-HOT-SPRINGS/MKSADLER-1923.jpg",
  "JL-BROOKE-KEGAN-DUNTON-HOT-SPRINGS/MKSADLER-1957.jpg",
  "JL-BROOKE-KEGAN-DUNTON-HOT-SPRINGS/MKSADLER-1969.jpg",
  "JL-BROOKE-KEGAN-DUNTON-HOT-SPRINGS/MKSADLER-2075.jpg",
  "JL-BROOKE-KEGAN-DUNTON-HOT-SPRINGS/MKSADLER-2091.jpg",
  "JL-BROOKE-KEGAN-DUNTON-HOT-SPRINGS/MKSADLER-2122.jpg",
  "JL-BROOKE-KEGAN-DUNTON-HOT-SPRINGS/MKSADLER-2124.jpg",
  "JL-BROOKE-KEGAN-DUNTON-HOT-SPRINGS/MKSADLER-2128.jpg",
  "JL-BROOKE-KEGAN-DUNTON-HOT-SPRINGS/MKSADLER-2132.jpg",
  "JL-BROOKE-KEGAN-DUNTON-HOT-SPRINGS/MKSADLER-2149.jpg",
  "JL-BROOKE-KEGAN-DUNTON-HOT-SPRINGS/MKSADLER-2161.jpg",
  "JL-BROOKE-KEGAN-DUNTON-HOT-SPRINGS/MKSADLER-2166.jpg",
  "JL-BROOKE-KEGAN-DUNTON-HOT-SPRINGS/MKSADLER-2192.jpg",
  "JL-BROOKE-KEGAN-DUNTON-HOT-SPRINGS/MKSADLER-2213.jpg",
  "JL-BROOKE-KEGAN-DUNTON-HOT-SPRINGS/MKSADLER-2215.jpg",
  "JL-BROOKE-KEGAN-DUNTON-HOT-SPRINGS/MKSADLER-2219.jpg",
  "JL-BROOKE-KEGAN-DUNTON-HOT-SPRINGS/MKSADLER-3626.jpg",
  "JL-BROOKE-KEGAN-DUNTON-HOT-SPRINGS/MKSADLER-3932-2.jpg",
  "JL-BROOKE-KEGAN-DUNTON-HOT-SPRINGS/MKSADLER-4112.jpg",
  "JL-BROOKE-KEGAN-DUNTON-HOT-SPRINGS/MKSADLER-4118-2.jpg",
  "JL-BROOKE-KEGAN-DUNTON-HOT-SPRINGS/MKSADLER-4130.jpg",
  "JL-BROOKE-KEGAN-DUNTON-HOT-SPRINGS/MKSADLER-4150.jpg",
  "JL-BROOKE-KEGAN-DUNTON-HOT-SPRINGS/MKSADLER-4164.jpg",
  "JL-BROOKE-KEGAN-DUNTON-HOT-SPRINGS/MKSADLER-4174.jpg",
  "JL-BROOKE-KEGAN-DUNTON-HOT-SPRINGS/MKSADLER-4181.jpg",
  "JL-BROOKE-KEGAN-DUNTON-HOT-SPRINGS/MKSADLER-4217.jpg",
  "JL-BROOKE-KEGAN-DUNTON-HOT-SPRINGS/MKSADLER-4312-2.jpg",
  "JL-BROOKE-KEGAN-DUNTON-HOT-SPRINGS/MKSADLER-4314.jpg",
  "JL-BROOKE-KEGAN-DUNTON-HOT-SPRINGS/MKSADLER-4644.jpg",
  "JL-BROOKE-KEGAN-DUNTON-HOT-SPRINGS/MKSADLER-4654.jpg",
  "JL-BROOKE-KEGAN-DUNTON-HOT-SPRINGS/MKSADLER-4674.jpg",
  "JL-BROOKE-KEGAN-DUNTON-HOT-SPRINGS/MKSADLER-4691.jpg",
  "JL-BROOKE-KEGAN-DUNTON-HOT-SPRINGS/MKSADLER-4732.jpg",
  "JL-BROOKE-KEGAN-DUNTON-HOT-SPRINGS/MKSADLER-4735-2.jpg",
  "JL-BROOKE-KEGAN-DUNTON-HOT-SPRINGS/MKSADLER-4735.jpg",
  "JL-BROOKE-KEGAN-DUNTON-HOT-SPRINGS/MKSADLER-4755.jpg",
  "JL-BROOKE-KEGAN-DUNTON-HOT-SPRINGS/MKSADLER-4758.jpg",
  "JL-BROOKE-KEGAN-DUNTON-HOT-SPRINGS/MKSADLER-4764.jpg",
  "JL-BROOKE-KEGAN-DUNTON-HOT-SPRINGS/MKSADLER-4772.jpg",
  "JL-BROOKE-KEGAN-DUNTON-HOT-SPRINGS/MKSADLER-4782.jpg",
  "JL-BROOKE-KEGAN-DUNTON-HOT-SPRINGS/MKSADLER-4793.jpg",
  "JL-BROOKE-KEGAN-DUNTON-HOT-SPRINGS/MKSADLER-4806.jpg",
  "JL-BROOKE-KEGAN-DUNTON-HOT-SPRINGS/MKSADLER-4807.jpg",
  "JL-BROOKE-KEGAN-DUNTON-HOT-SPRINGS/MKSADLER-4817.jpg",
  "JL-BROOKE-KEGAN-DUNTON-HOT-SPRINGS/MKSADLER-4821.jpg",
  "JL-BROOKE-KEGAN-DUNTON-HOT-SPRINGS/MKSADLER-4835.jpg",
  "JL-BROOKE-KEGAN-DUNTON-HOT-SPRINGS/MKSADLER-4837.jpg",
  "JL-BROOKE-KEGAN-DUNTON-HOT-SPRINGS/MKSADLER-4845.jpg",
  "JL-BROOKE-KEGAN-DUNTON-HOT-SPRINGS/MKSADLER-4996.jpg",
  "JL-BROOKE-KEGAN-DUNTON-HOT-SPRINGS/MKSADLER-5054.jpg",
  "JL-BROOKE-KEGAN-DUNTON-HOT-SPRINGS/MKSADLER-5058.jpg",
  "JL-BROOKE-KEGAN-DUNTON-HOT-SPRINGS/MKSADLER-5067.jpg",
  "JL-BROOKE-KEGAN-DUNTON-HOT-SPRINGS/MKSADLER-5087.jpg",
  "JL-BROOKE-KEGAN-DUNTON-HOT-SPRINGS/MKSADLER-5220.jpg",
  "JL-BROOKE-KEGAN-DUNTON-HOT-SPRINGS/MKSADLER-5268.jpg",
  "JL-BROOKE-KEGAN-DUNTON-HOT-SPRINGS/MKSADLER-5349.jpg",
  "JL-BROOKE-KEGAN-DUNTON-HOT-SPRINGS/MKSADLER-5473.jpg",
  "JL-BROOKE-KEGAN-DUNTON-HOT-SPRINGS/MKSADLER-5475.jpg",
  "JL-BROOKE-KEGAN-DUNTON-HOT-SPRINGS/MKSADLER-5476.jpg",
  "JL-BROOKE-KEGAN-DUNTON-HOT-SPRINGS/MKSADLER-5486.jpg",
  "JL-BROOKE-KEGAN-DUNTON-HOT-SPRINGS/MKSADLER-5488.jpg",
  "JL-BROOKE-KEGAN-DUNTON-HOT-SPRINGS/MKSADLER-5491.jpg",
  "JL-BROOKE-KEGAN-DUNTON-HOT-SPRINGS/MKSADLER-5494.jpg",
] as const;

export const brookeKeganDuntonGalleryHero: GalleryImage = {
  src: galleriesUrl("JL-BROOKE-KEGAN-DUNTON-HOT-SPRINGS/MKSADLER-1893.jpg"),
  alt: "Long table set in a mountain meadow at Dunton Hot Springs",
};

export const brookeKeganDuntonGalleryImages = createGalleryImages([...brookeKeganDuntonGalleryPaths], "Brooke Keegan Events");

export const lyndenLaneGalleryPaths = [
  "LYNDEN-LANE/nb-25-taylor&brenden-1049.webp",
  "LYNDEN-LANE/nb-25-taylor&brenden-1051.webp",
  "LYNDEN-LANE/nb-25-taylor&brenden-1054.webp",
  "LYNDEN-LANE/nb-25-taylor&brenden-1061.webp",
  "LYNDEN-LANE/nb-25-taylor&brenden-1065.webp",
  "LYNDEN-LANE/nb-25-taylor&brenden-1083.webp",
  "LYNDEN-LANE/nb-25-taylor&brenden-1143.webp",
  "LYNDEN-LANE/nb-25-taylor&brenden-1196.webp",
  "LYNDEN-LANE/nb-25-taylor&brenden-1367-min.webp",
  "LYNDEN-LANE/nb-25-taylor&brenden-1401-min.webp",
  "LYNDEN-LANE/nb-25-taylor&brenden-1402-min.webp",
  "LYNDEN-LANE/nb-25-taylor&brenden-1404-min.webp",
  "LYNDEN-LANE/nb-25-taylor&brenden-1407-min.webp",
  "LYNDEN-LANE/nb-25-taylor&brenden-1409-min.webp",
  "LYNDEN-LANE/nb-25-taylor&brenden-1412-min.webp",
  "LYNDEN-LANE/nb-25-taylor&brenden-1417-min.webp",
  "LYNDEN-LANE/nb-25-taylor&brenden-1423-min.webp",
  "LYNDEN-LANE/nb-25-taylor&brenden-1425-min.webp",
  "LYNDEN-LANE/nb-25-taylor&brenden-1474-min.webp",
  "LYNDEN-LANE/nb-25-taylor&brenden-1480-min.webp",
  "LYNDEN-LANE/nb-25-taylor&brenden-1496-min.webp",
] as const;

export const lyndenLaneGalleryHero: GalleryImage = {
  src: galleriesUrl("LYNDEN-LANE/nb-25-taylor&brenden-1083.webp"),
  alt: "Outdoor lounge and cocktail setting outside a modernist residence",
};

export const lyndenLaneGalleryImages = createGalleryImages([...lyndenLaneGalleryPaths], "Lynden Lane");


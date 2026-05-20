import { galleriesUrl } from "@/lib/storage-image";
import type { GalleryImage } from "./gallery-projects";

function createGalleryImages(paths: string[], projectName: string): GalleryImage[] {
  return paths.map((path) => ({
    src: galleriesUrl(path),
    alt: `${projectName} event environment by Eclectic Hive`,
  }));
}

// AMANGIRI — re-mirrored from Drive "FEATURE Amangiri" + "Easton - Gahan Wedding at Amangiri".
// Pool deck subfolder intentionally skipped per owner note. Order: Chinle dinner → amphitheater/Raven's Nest → Fireside → gahan tablescapes → add-on context.
export const amangiriGalleryPaths = [
  // Chinle long-table night dinner — named hero shots first, UUIDs follow.
  "AMANGIRI/chinledinner__ADD_Night_Shot_2.jpg",
  "AMANGIRI/chinledinner__ADD_ON_Night_Shot_3.jpg",
  "AMANGIRI/chinledinner__ADD_ON_Night_Shot.jpg",
  "AMANGIRI/chinledinner__6789D72F-6EB7-44D8-84EE-86BCA7508F40.jpeg",
  "AMANGIRI/chinledinner__7647E845-F536-4FA2-B8D9-413235469B93.jpeg",
  "AMANGIRI/chinledinner__9FA43D2A-18B6-47DD-BC32-4C5954652A03.jpeg",
  "AMANGIRI/chinledinner__901812D7-2888-4845-B169-A84E01055887.jpeg",
  "AMANGIRI/chinledinner__A9ABE9B9-4A01-450B-86F9-7A16DDFD309B.jpeg",
  "AMANGIRI/chinledinner__001E819A-28F7-4213-AAF8-582DA79BD2AE.jpeg",
  "AMANGIRI/chinledinner__144E0330-AD74-41F3-8C28-6B25B9014594.jpeg",
  "AMANGIRI/chinledinner__AF773B03-E607-4852-9C8B-781EF04571B3.jpeg",
  "AMANGIRI/chinledinner__804F1F6A-8B58-420D-8AC6-789E893F63B8.jpeg",
  "AMANGIRI/chinledinner__EA58C3FF-60AD-421A-8A91-BB60858346B2.jpeg",
  "AMANGIRI/chinledinner__9F0C6607-29FC-4EBC-99B7-93660C1548EC.jpeg",
  "AMANGIRI/chinledinner__B4D1117D-A51C-4F41-A764-E54F09A62D9E.jpeg",
  "AMANGIRI/chinledinner__D9D9D665-C36F-4654-9687-7303B1A05765.jpeg",
  "AMANGIRI/chinledinner__436169D8-B014-4008-9423-D46FF099ED0E.jpeg",
  "AMANGIRI/chinledinner__DDE504F0-DD80-4535-B5AD-3B9EDD1F7BD4.jpeg",
  "AMANGIRI/chinledinner__FB1B4745-4D26-47AB-8758-5794A21024AF.jpeg",
  "AMANGIRI/chinledinner__CE8DBB8D-A1B1-47C2-9007-A8E85C88B92F.jpeg",
  "AMANGIRI/chinledinner__E651EE9E-68C2-47B4-81A8-C5401B8C01E3.jpeg",
  "AMANGIRI/chinledinner__110831F7-67A0-4AEA-AED2-E30CE506F4CD.jpeg",
  "AMANGIRI/chinledinner__C5E2270E-3A24-43CA-88E1-7B1B1BDCE57A.jpeg",
  "AMANGIRI/chinledinner__7D8614FC-0662-40D6-A538-25FA00B53DDB.jpeg",
  "AMANGIRI/chinledinner__7144CC64-9899-4BE7-A4D6-42724CB26CDA.jpeg",
  "AMANGIRI/chinledinner__EF67304A-7D95-4D45-9857-8DAE00B0A83F.jpeg",
  "AMANGIRI/chinledinner__D8BAD42B-DD6B-4441-A6CE-152F962207C1.jpeg",
  "AMANGIRI/chinledinner__46C7AB3B-6352-4C43-A045-F57661AAB435.jpeg",
  "AMANGIRI/chinledinner__7B6070E0-B1D8-4FE2-8067-A609B177AE80.jpeg",
  "AMANGIRI/chinledinner__3E4ABFDA-CA7A-4498-9D40-28C060048981.jpeg",
  "AMANGIRI/chinledinner__89BC3565-9E76-443A-AFB8-8DB55BF40796.jpeg",
  "AMANGIRI/chinledinner__8F1F3ACC-C9DD-41BA-B77E-729AE7E1292D.jpeg",
  "AMANGIRI/chinledinner__182DA9E4-679F-40E2-8562-09A55FE3BB05.jpeg",
  "AMANGIRI/chinledinner__FF401618-B7F5-4278-8EB4-CC9D7FC65474.jpeg",
  "AMANGIRI/chinledinner__900EEFCC-89A5-4FB7-B5BB-C3AF282EA592.jpeg",
  "AMANGIRI/chinledinner__360C1662-B593-4021-9BF5-7DB1D7DA422E.jpeg",
  "AMANGIRI/chinledinner__F9F5C324-B675-4F8E-8475-E29A00E6146B.jpeg",
  "AMANGIRI/chinledinner__2D99C581-FD9C-4538-BC23-C29B819E51BE.jpeg",
  "AMANGIRI/chinledinner__704BB302-B473-49C4-AA1A-9DAE265FB3F9.jpeg",
  "AMANGIRI/chinledinner__172CFD8F-EF0D-4A51-8B39-56B2BE28D2F8.jpeg",
  "AMANGIRI/chinledinner__2086C4C4-EBE4-479F-A95D-A40BA7C8C37D.jpeg",
  "AMANGIRI/chinledinner__17A871EE-E270-4F0C-8F7F-39B4058D9B21.jpeg",
  // Amphitheater / Raven's Nest — named first, UUIDs follow.
  "AMANGIRI/amphitheaterravensnest__ADD_ON_Welcome.jpg",
  "AMANGIRI/amphitheaterravensnest__ADD_On_Bar_2.jpg",
  "AMANGIRI/amphitheaterravensnest__ADD_ON_Bar.jpg",
  "AMANGIRI/amphitheaterravensnest__ADD_ON_Close_Up_Lounge.jpg",
  "AMANGIRI/amphitheaterravensnest__ADD_ON_Petite_Lounge.jpg",
  "AMANGIRI/amphitheaterravensnest__ADD_ON_Lounge.jpg",
  "AMANGIRI/amphitheaterravensnest__ADD_ON_Lounge_+_floral.jpg",
  "AMANGIRI/amphitheaterravensnest__ADD_ON_Close_Up.jpg",
  "AMANGIRI/amphitheaterravensnest__F756DB53-AEA0-48F7-87F5-6A65E580DCA9.jpeg",
  "AMANGIRI/amphitheaterravensnest__9D0CDD36-2379-485A-95AC-D1002BB7270D.jpeg",
  "AMANGIRI/amphitheaterravensnest__98171ECC-C860-4911-BC61-6FD36A14E85E.jpeg",
  "AMANGIRI/amphitheaterravensnest__AD86EF2A-10FA-4656-938D-5001FF32CC0E.jpeg",
  "AMANGIRI/amphitheaterravensnest__3E9A02E2-E2B5-48CD-ADD1-CA72696EB7ED.jpeg",
  "AMANGIRI/amphitheaterravensnest__39503C36-4ACA-4044-8769-4C6A3A54024A.jpeg",
  "AMANGIRI/amphitheaterravensnest__876CAB81-E83E-4D52-9C11-A7324AE6D3D5.jpeg",
  "AMANGIRI/amphitheaterravensnest__9E9035E0-E84F-4079-B303-B815CC5F99F9.jpeg",
  "AMANGIRI/amphitheaterravensnest__A4B28427-D41D-4FE6-94E5-D96D5EAE6C65.jpeg",
  "AMANGIRI/amphitheaterravensnest__923B893B-128A-4F0F-B4D7-2A1FD93D42B7.jpeg",
  "AMANGIRI/amphitheaterravensnest__4D7CEAAF-3AB9-4FDE-8816-3E2F48884B2F.jpeg",
  "AMANGIRI/amphitheaterravensnest__8D3495B8-561D-4F8C-BA93-EE46B40063ED.jpeg",
  "AMANGIRI/amphitheaterravensnest__18A2F936-BF79-4B89-85B5-CD4A21DEF869.jpeg",
  "AMANGIRI/amphitheaterravensnest__3123EA4B-F726-4905-8E0A-D4B72CFE124F.jpeg",
  "AMANGIRI/amphitheaterravensnest__7D28AF40-82DD-44AE-B61F-09E6B70710E8.jpeg",
  "AMANGIRI/amphitheaterravensnest__52F22DC9-772E-4E6C-AC83-A410C9872E57.jpeg",
  "AMANGIRI/amphitheaterravensnest__F48C68F1-2D4F-42FC-A6C2-16F90B2E8730.jpeg",
  "AMANGIRI/amphitheaterravensnest__C631CFB9-BE43-465B-BB80-0AEF41D4210E.jpeg",
  "AMANGIRI/amphitheaterravensnest__4AD5F098-D518-4F88-BF74-DD99FB94F7C6.jpeg",
  // Fireside — all 5 per owner note.
  "AMANGIRI/Fireside__Lounge.jpg",
  "AMANGIRI/Fireside__Lounge_2.jpg",
  "AMANGIRI/Fireside__Lounge_3.jpg",
  "AMANGIRI/Fireside__Lounge_Close_Up.jpg",
  "AMANGIRI/Fireside__Lounge_+_Floral_Close_Up.jpg",
  // Gahan companion — Raven's Nest at night, tablescapes, lounge in amp.
  "AMANGIRI/gahan__Raven_s_Nest_at_Night.jpg",
  "AMANGIRI/gahan__Raven_s_Nest_at_Night2_.jpg",
  "AMANGIRI/gahan__Raven_s_Nest_at_Night_3_.jpg",
  "AMANGIRI/gahan__Lounge_in_Amp.jpg",
  "AMANGIRI/gahan__Lounge_2.jpg",
  "AMANGIRI/gahan__Lounge_3_with_Floral.jpg",
  "AMANGIRI/gahan__Bar_in_Amp.jpg",
  "AMANGIRI/gahan__Tablescape_1.jpg",
  "AMANGIRI/gahan__Tablescape_2.jpg",
  "AMANGIRI/gahan__Tablescape_3.jpg",
  "AMANGIRI/gahan__Tablescape_4.jpg",
  "AMANGIRI/gahan__Tablescape_5.jpg",
  "AMANGIRI/gahan__Tablescape_6.jpg",
  "AMANGIRI/gahan__Tablesetting.jpg",
  "AMANGIRI/gahan__Tablesetting_2.jpg",
  "AMANGIRI/gahan__Amangiri_daylight.jpg",
  // Add-On context (property at night).
  "AMANGIRI/Add_On__Property_At_Night.jpg",
  "AMANGIRI/Add_On__Property_and_Pool.jpg",
] as const;

export const amangiriGalleryHero: GalleryImage = {
  src: galleriesUrl("AMANGIRI/chinledinner__ADD_Night_Shot_2.jpg"),
  alt: "Chinle long-table dinner lit by lanterns against the Amangiri sandstone at night",
};

export const amangiriGalleryImages = createGalleryImages([...amangiriGalleryPaths], "Amangiri");

// Flow: day setup (tent + tablescapes + ceremony) → personal day moments → night (toast → first dance → night tent)
export const aspenEventWorksGalleryPaths = [
  // Daytime tent + setup
  "ASPEN-EVENT-WORKS-ASPEN-PRIVATE-RANCH/Tent 2.jpg",
  "ASPEN-EVENT-WORKS-ASPEN-PRIVATE-RANCH/Tent.jpg",
  "ASPEN-EVENT-WORKS-ASPEN-PRIVATE-RANCH/Tent 3.jpg",
  "ASPEN-EVENT-WORKS-ASPEN-PRIVATE-RANCH/Tent 4.jpg",
  "ASPEN-EVENT-WORKS-ASPEN-PRIVATE-RANCH/Seating with Views.jpg",
  "ASPEN-EVENT-WORKS-ASPEN-PRIVATE-RANCH/Tablescape.jpg",
  "ASPEN-EVENT-WORKS-ASPEN-PRIVATE-RANCH/Tablescape Close Up.jpg",
  "ASPEN-EVENT-WORKS-ASPEN-PRIVATE-RANCH/Tablescape Close Up 2.jpg",
  "ASPEN-EVENT-WORKS-ASPEN-PRIVATE-RANCH/Tablescape Close Up 3.jpg",
  "ASPEN-EVENT-WORKS-ASPEN-PRIVATE-RANCH/Tablescape Close Up 4.jpg",
  "ASPEN-EVENT-WORKS-ASPEN-PRIVATE-RANCH/Stone Plates.jpg",
  "ASPEN-EVENT-WORKS-ASPEN-PRIVATE-RANCH/Pretty Little Details.jpg",
  "ASPEN-EVENT-WORKS-ASPEN-PRIVATE-RANCH/Escort Display.jpg",
  "ASPEN-EVENT-WORKS-ASPEN-PRIVATE-RANCH/Lounge Close Up.jpg",
  "ASPEN-EVENT-WORKS-ASPEN-PRIVATE-RANCH/Cake with a view.jpg",
  // Personal day moments
  "ASPEN-EVENT-WORKS-ASPEN-PRIVATE-RANCH/Wedding Day Bride.jpg",
  "ASPEN-EVENT-WORKS-ASPEN-PRIVATE-RANCH/Wedding Day Bride 2.jpg",
  "ASPEN-EVENT-WORKS-ASPEN-PRIVATE-RANCH/Wedding Day Bride 3.jpg",
  "ASPEN-EVENT-WORKS-ASPEN-PRIVATE-RANCH/Wedding Day Couple.jpg",
  "ASPEN-EVENT-WORKS-ASPEN-PRIVATE-RANCH/Wedding Day Couple 2.jpg",
  "ASPEN-EVENT-WORKS-ASPEN-PRIVATE-RANCH/Bride and her horse.jpg",
  "ASPEN-EVENT-WORKS-ASPEN-PRIVATE-RANCH/Bride and her horse 2.jpg",
  "ASPEN-EVENT-WORKS-ASPEN-PRIVATE-RANCH/Horse.jpg",
  "ASPEN-EVENT-WORKS-ASPEN-PRIVATE-RANCH/Nature Hike.jpg",
  // Ceremony
  "ASPEN-EVENT-WORKS-ASPEN-PRIVATE-RANCH/Ceremony Favorite.jpg",
  "ASPEN-EVENT-WORKS-ASPEN-PRIVATE-RANCH/Ceremony.jpg",
  "ASPEN-EVENT-WORKS-ASPEN-PRIVATE-RANCH/Ceremony 2.jpg",
  "ASPEN-EVENT-WORKS-ASPEN-PRIVATE-RANCH/Our Bride.jpg",
  "ASPEN-EVENT-WORKS-ASPEN-PRIVATE-RANCH/Couple 2.jpg",
  "ASPEN-EVENT-WORKS-ASPEN-PRIVATE-RANCH/Couple 3.jpg",
  "ASPEN-EVENT-WORKS-ASPEN-PRIVATE-RANCH/Couple 3 with horse.jpg",
  "ASPEN-EVENT-WORKS-ASPEN-PRIVATE-RANCH/Guests.jpg",
  // Night reception
  "ASPEN-EVENT-WORKS-ASPEN-PRIVATE-RANCH/Couple at Toast.jpg",
  "ASPEN-EVENT-WORKS-ASPEN-PRIVATE-RANCH/Cheers B+W.jpg",
  "ASPEN-EVENT-WORKS-ASPEN-PRIVATE-RANCH/Champagne Tower.jpg",
  "ASPEN-EVENT-WORKS-ASPEN-PRIVATE-RANCH/Dinner Service B+W.jpg",
  "ASPEN-EVENT-WORKS-ASPEN-PRIVATE-RANCH/Nighttime Tablescape.jpg",
  "ASPEN-EVENT-WORKS-ASPEN-PRIVATE-RANCH/First Dance.jpg",
  "ASPEN-EVENT-WORKS-ASPEN-PRIVATE-RANCH/Couple Black and White.jpg",
  "ASPEN-EVENT-WORKS-ASPEN-PRIVATE-RANCH/Tent at Night.jpg",
  "ASPEN-EVENT-WORKS-ASPEN-PRIVATE-RANCH/Tent at Night 2.jpg",
  "ASPEN-EVENT-WORKS-ASPEN-PRIVATE-RANCH/Bride at Night B+W.jpg",
] as const;

export const aspenEventWorksGalleryHero: GalleryImage = {
  src: galleriesUrl("ASPEN-EVENT-WORKS-ASPEN-PRIVATE-RANCH/Tent 2.jpg"),
  alt: "Ceremony aisle framed by meadow flowers with mountain views beyond",
};

export const aspenEventWorksGalleryImages = createGalleryImages([...aspenEventWorksGalleryPaths], "Aspen Event Works");

// Flow: Aspen landscape → Welcome Party (day) → Rehearsal Dinner → After-party (night)
export const birchDesignGalleryPaths = [
  "BIRCH-DESIGN/Aspen.jpg",
  "BIRCH-DESIGN/Welcome Hat Branding.jpg",
  "BIRCH-DESIGN/Welcome Lounge Detail .jpg",
  "BIRCH-DESIGN/Welcome Party Aspen Art Museum.jpg",
  "BIRCH-DESIGN/Caribou Rehearsal Dinner Tablescape 2.jpg",
  "BIRCH-DESIGN/Caribou Rehearsal Dinner Tablescape 3.jpg",
  "BIRCH-DESIGN/Caribou Rehearsal Dinner Close Up 2.jpg",
  "BIRCH-DESIGN/Antler Bar.jpg",
  "BIRCH-DESIGN/Disco Lounge.jpg",
  "BIRCH-DESIGN/Disco Detail.jpg",
  "BIRCH-DESIGN/Disco After Party.jpg",
  "BIRCH-DESIGN/Disco After Party 2.jpg",
] as const;

export const birchDesignGalleryHero: GalleryImage = {
  src: galleriesUrl("BIRCH-DESIGN/Caribou Rehearsal Dinner Tablescape 2.jpg"),
  alt: "Rehearsal dinner table set against a dark green wall with framed art",
};

export const birchDesignGalleryImages = createGalleryImages([...birchDesignGalleryPaths], "Birch Design Studio");

// Flow: Montana landscape → Welcome Alpine (day) → Cocktail Hour → Ceremony → Reception → Tent (night)
export const eastonEventsMontanaGalleryPaths = [
  // Landscape opener
  "EASTON-EVENTS-MONTANA/Montana.jpg",
  "EASTON-EVENTS-MONTANA/Montana 2.jpg",
  "EASTON-EVENTS-MONTANA/Montana 3.jpg",
  // Welcome Alpine Party (day setup → dining)
  "EASTON-EVENTS-MONTANA/Welcome Party.jpg",
  "EASTON-EVENTS-MONTANA/Welcome Alpine Party Lounge.jpg",
  "EASTON-EVENTS-MONTANA/Welcome Alpine Party Lounge 2.jpg",
  "EASTON-EVENTS-MONTANA/Welcome Alpine Party Lounge 3.jpg",
  "EASTON-EVENTS-MONTANA/Welcome Alpine Party Lounge 4.jpg",
  "EASTON-EVENTS-MONTANA/Welcome Alpine Party Lounge 5.jpg",
  "EASTON-EVENTS-MONTANA/Welcome Alpine Party Lounge 6.jpg",
  "EASTON-EVENTS-MONTANA/Welcome Alpine Party Lounge 7.jpg",
  "EASTON-EVENTS-MONTANA/Welcome Alpine Party Dining.jpg",
  // Personal moment
  "EASTON-EVENTS-MONTANA/Bride.jpg",
  // Ceremony architecture
  "EASTON-EVENTS-MONTANA/Ceremony Chairs.jpg",
  "EASTON-EVENTS-MONTANA/Ceremony Chairs 2.jpg",
  "EASTON-EVENTS-MONTANA/Ceremony.jpg",
  "EASTON-EVENTS-MONTANA/Ceremony 3.jpg",
  // Cocktail hour
  "EASTON-EVENTS-MONTANA/Cocktail HOur.jpg",
  "EASTON-EVENTS-MONTANA/Cocktail Hour 2.jpg",
  "EASTON-EVENTS-MONTANA/Cocktail Hour 3.jpg",
  "EASTON-EVENTS-MONTANA/Wedding Lounge.jpg",
  "EASTON-EVENTS-MONTANA/Wedding Lounge 2.jpg",
  // Tent reveal → reception → night
  "EASTON-EVENTS-MONTANA/Tent.jpg",
  "EASTON-EVENTS-MONTANA/Tent 2.jpg",
  "EASTON-EVENTS-MONTANA/Reception.jpg",
  "EASTON-EVENTS-MONTANA/Reception 2.jpg",
  "EASTON-EVENTS-MONTANA/Reception 3.jpg",
  "EASTON-EVENTS-MONTANA/Reception 4.jpg",
  "EASTON-EVENTS-MONTANA/Reception 5.jpg",
  "EASTON-EVENTS-MONTANA/Reception 6.jpg",
  "EASTON-EVENTS-MONTANA/Tent 3.jpg",
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
  src: galleriesUrl("LYNDEN-LANE/nb-25-taylor&brenden-1143.webp"),
  alt: "Modernist outdoor lounge against architectural lines, Telluride",
};

// Owner-excluded plate (:1083) filtered before mapping.
export const lyndenLaneGalleryImages = createGalleryImages(
  lyndenLaneGalleryPaths.filter((p) => !p.includes("1083")),
  "Lynden Lane",
);

export const vanderWeideGalleryPaths = [
  "VanderWeideK/001_DSC02335.JPG",
  "VanderWeideK/002_486174_0006.jpg",
  "VanderWeideK/003_486154_0005.jpg",
  "VanderWeideK/003_DSC02346.JPG",
  "VanderWeideK/005_486175_0005.jpg",
  "VanderWeideK/007_486154_0012.jpg",
  "VanderWeideK/007_486175_0008.jpg",
  "VanderWeideK/007_DSC02360.JPG",
  "VanderWeideK/008_486154_0015.jpg",
  "VanderWeideK/009_486155_0001.jpg",
  "VanderWeideK/009_486175_0013.jpg",
  "VanderWeideK/010_486155_0008.jpg",
  "VanderWeideK/012_486155_0011.jpg",
  "VanderWeideK/012_486173_0001.jpg",
  "VanderWeideK/013_486173_0002.jpg",
  "VanderWeideK/014_486173_0004.jpg",
  "VanderWeideK/017_486156_0003.jpg",
  "VanderWeideK/017_486173_0012.jpg",
  "VanderWeideK/278_DSC01191.JPG",
  "VanderWeideK/320_DSC01354.JPG",
  "VanderWeideK/330_DSC01401.JPG",
  "VanderWeideK/335_DSC01414.JPG",
  "VanderWeideK/337_DSC01422.JPG",
  "VanderWeideK/338_DSC01435.JPG",
  "VanderWeideK/408_DSC09136.JPG",
  "VanderWeideK/458_DSC09395.JPG",
  "VanderWeideK/473_DSC02301.JPG",
  "VanderWeideK/571_DSC09427.JPG",
  "VanderWeideK/572_DSC09431.JPG",
  "VanderWeideK/577_DSC09467.JPG",
  "VanderWeideK/627_DSC02464.JPG",
  "VanderWeideK/DSC00274.JPG",
  "VanderWeideK/DSC00278.JPG",
  "VanderWeideK/DSC00338.JPG",
  "VanderWeideK/DSC00343.JPG",
  "VanderWeideK/DSC00378.jpg",
  "VanderWeideK/DSC00384.jpg",
  "VanderWeideK/DSC00491.jpg",
  "VanderWeideK/DSC00524.JPG",
  "VanderWeideK/DSC00579-2.JPG",
  "VanderWeideK/DSC00579.JPG",
  "VanderWeideK/DSC00611.JPG",
  "VanderWeideK/DSC00720.jpg",
  "VanderWeideK/DSC00933.jpg",
  "VanderWeideK/DSC01008.JPG",
  "VanderWeideK/DSC01150.JPG",
  "VanderWeideK/DSC01199.JPG",
  "VanderWeideK/DSC01224.jpg",
  "VanderWeideK/DSC01229 (1).JPG",
  "VanderWeideK/DSC01229.JPG",
  "VanderWeideK/DSC01249.jpg",
  "VanderWeideK/DSC01261.jpg",
  "VanderWeideK/DSC01281.jpg",
  "VanderWeideK/DSC01348.jpg",
  "VanderWeideK/DSC01397.JPG",
  "VanderWeideK/DSC01521.JPG",
  "VanderWeideK/DSC01522.jpg",
  "VanderWeideK/DSC02289.jpg",
  "VanderWeideK/DSC02415.jpg",
  "VanderWeideK/DSC02694.jpg",
  "VanderWeideK/DSC04512.jpg",
  "VanderWeideK/DSC04524.jpg",
  "VanderWeideK/DSC04545.jpg",
  "VanderWeideK/DSC04552.jpg",
  "VanderWeideK/DSC04579.jpg",
  "VanderWeideK/DSC04605.jpg",
  "VanderWeideK/DSC04631.jpg",
  "VanderWeideK/DSC04720.JPG",
  "VanderWeideK/DSC04752.JPG",
  "VanderWeideK/DSC04779.JPG",
  "VanderWeideK/DSC04792.JPG",
  "VanderWeideK/DSC04808.JPG",
  "VanderWeideK/DSC04839.JPG",
  "VanderWeideK/DSC04876.JPG",
  "VanderWeideK/DSC04886.JPG",
  "VanderWeideK/DSC04918.JPG",
  "VanderWeideK/DSC04920 (1).JPG",
  "VanderWeideK/DSC05194.jpg",
  "VanderWeideK/DSC05356.jpg",
  "VanderWeideK/DSC05364.jpg",
  "VanderWeideK/DSC05704.jpg",
  "VanderWeideK/DSC09690.JPG",
  "VanderWeideK/DSC09923.JPG",
  "VanderWeideK/DSC09943.JPG",
  "VanderWeideK/DSC09953.JPG",
] as const;

export const vanderWeideGalleryHero: GalleryImage = {
  src: galleriesUrl("VanderWeideK/001_DSC02335.JPG"),
  alt: "VanderWeide wedding environment by Eclectic Hive",
};

export const vanderWeideGalleryImages = createGalleryImages([...vanderWeideGalleryPaths], "VanderWeide");

export const dosMasEnLaMesaGalleryPaths = [
  "dosmasenlamesalittrell/20220917_Dosmasenlamesa_AlisonAlex_colorado-59.jpg",
  "dosmasenlamesalittrell/20220917_Dosmasenlamesa_AlisonAlex_colorado-67.jpg",
  "dosmasenlamesalittrell/20220917_Dosmasenlamesa_AlisonAlex_colorado-158.jpg",
  "dosmasenlamesalittrell/20220917_Dosmasenlamesa_AlisonAlex_colorado-163.jpg",
  "dosmasenlamesalittrell/20220917_Dosmasenlamesa_AlisonAlex_colorado-166.jpg",
  "dosmasenlamesalittrell/20220917_Dosmasenlamesa_AlisonAlex_colorado-173.jpg",
  "dosmasenlamesalittrell/20220917_Dosmasenlamesa_AlisonAlex_colorado-218.jpg",
  "dosmasenlamesalittrell/20220917_Dosmasenlamesa_AlisonAlex_colorado-219.jpg",
  "dosmasenlamesalittrell/20220917_Dosmasenlamesa_AlisonAlex_colorado-244.jpg",
  "dosmasenlamesalittrell/20220917_Dosmasenlamesa_AlisonAlex_colorado-246.jpg",
  "dosmasenlamesalittrell/20220917_Dosmasenlamesa_AlisonAlex_colorado-261.jpg",
  "dosmasenlamesalittrell/20220917_Dosmasenlamesa_AlisonAlex_colorado-271.jpg",
  "dosmasenlamesalittrell/20220917_Dosmasenlamesa_AlisonAlex_colorado-272.jpg",
  "dosmasenlamesalittrell/20220917_Dosmasenlamesa_AlisonAlex_colorado-274.jpg",
  "dosmasenlamesalittrell/20220917_Dosmasenlamesa_AlisonAlex_colorado-327.jpg",
  "dosmasenlamesalittrell/20220917_Dosmasenlamesa_AlisonAlex_colorado-331.jpg",
  "dosmasenlamesalittrell/dosmasenlamesa_Alisson&Alexwedding_Colorado-7.jpg",
  "dosmasenlamesalittrell/dosmasenlamesa_Alisson&Alexwedding_Colorado-15.jpg",
  "dosmasenlamesalittrell/dosmasenlamesa_Alisson&Alexwedding_Colorado-28.jpg",
  "dosmasenlamesalittrell/dosmasenlamesa_Alisson&Alexwedding_Colorado-33.jpg",
] as const;

export const dosMasEnLaMesaGalleryHero: GalleryImage = {
  src: galleriesUrl("dosmasenlamesalittrell/20220917_Dosmasenlamesa_AlisonAlex_colorado-158.jpg"),
  alt: "Dos Mas En La Mesa wedding environment in Colorado by Eclectic Hive",
};

export const dosMasEnLaMesaGalleryImages = createGalleryImages([...dosMasEnLaMesaGalleryPaths], "Dos Mas En La Mesa");

// ---------------------------------------------------------------------------
// Pending placeholder — used for galleries whose storage folders are still
// being prepared by the owner. Renders as a quiet charcoal plate (no broken
// image) so the index, filmstrip, and lightbox can ship the new 15-project
// order before every folder is uploaded.
// ---------------------------------------------------------------------------

// 4:5 charcoal swatch with a thin warm hairline. Inlined so it never hits
// the network and never depends on storage availability.
const PENDING_PLATE_SVG = encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000" preserveAspectRatio="xMidYMid slice">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#1a1a1a"/>
        <stop offset="100%" stop-color="#101010"/>
      </linearGradient>
    </defs>
    <rect width="800" height="1000" fill="url(#g)"/>
    <line x1="80" y1="920" x2="180" y2="920" stroke="rgba(245,242,237,0.35)" stroke-width="1"/>
  </svg>`,
);

export const PENDING_HERO_SRC = `data:image/svg+xml;charset=utf-8,${PENDING_PLATE_SVG}`;

export const pendingGalleryHero = (label: string): GalleryImage => ({
  src: PENDING_HERO_SRC,
  alt: `${label} — imagery in preparation`,
});




// === Mirrored from Drive 2026-05-20 ===

// Flow: landscape/arrival (day) → Mehndi/Sangeet day → wedding day décor → ceremony → reception → Bankie Banks/Casino (night)
export const anguillaMicheleRagoGalleryPaths = [
  // Landscape & arrival
  "ANGUILLA-MICHELLE-RAGO/Anguilla.jpg",
  "ANGUILLA-MICHELLE-RAGO/Landscape.jpg",
  "ANGUILLA-MICHELLE-RAGO/Landscape_2.jpg",
  "ANGUILLA-MICHELLE-RAGO/Private_Island_Arrival.jpg",
  "ANGUILLA-MICHELLE-RAGO/Private_Island.jpg",
  "ANGUILLA-MICHELLE-RAGO/Private_Island_2.jpg",
  "ANGUILLA-MICHELLE-RAGO/Private_Island_3.jpg",
  "ANGUILLA-MICHELLE-RAGO/Private_Island_4.jpg",
  "ANGUILLA-MICHELLE-RAGO/Beach_Day.jpg",
  "ANGUILLA-MICHELLE-RAGO/Beach_Day_Island.jpg",
  "ANGUILLA-MICHELLE-RAGO/The_Shipwreck.jpg",
  // Host property
  "ANGUILLA-MICHELLE-RAGO/Host_Property.jpg",
  "ANGUILLA-MICHELLE-RAGO/Host_Property_2.jpg",
  "ANGUILLA-MICHELLE-RAGO/Host_Property_3.jpg",
  "ANGUILLA-MICHELLE-RAGO/Host_Property_4.jpg",
  "ANGUILLA-MICHELLE-RAGO/Gifting_Room.jpg",
  // Mehndi (day)
  "ANGUILLA-MICHELLE-RAGO/Mehndi.jpg",
  "ANGUILLA-MICHELLE-RAGO/Mehndi_2.jpg",
  // Sangeet daytime
  "ANGUILLA-MICHELLE-RAGO/Sangeet_Daytime.jpg",
  "ANGUILLA-MICHELLE-RAGO/Sangeet_Daytime_2.jpg",
  "ANGUILLA-MICHELLE-RAGO/Sangeet_Daytime_3.jpg",
  "ANGUILLA-MICHELLE-RAGO/Sangeet_Daytime_4.jpg",
  // Wedding day — lounge by the sea / bar / sofa
  "ANGUILLA-MICHELLE-RAGO/Wedding_Day_Lounge_by_the_Sea.jpg",
  "ANGUILLA-MICHELLE-RAGO/Wedding_Day_Lounge_by_the_Sea_Close_Up.jpg",
  "ANGUILLA-MICHELLE-RAGO/Sofa_by_the_sea.jpg",
  "ANGUILLA-MICHELLE-RAGO/Bar_by_the_Sea.jpg",
  "ANGUILLA-MICHELLE-RAGO/Wedding_Ceremony_Lounge.jpg",
  // Ceremony
  "ANGUILLA-MICHELLE-RAGO/Ceremony_Favorite.jpg",
  "ANGUILLA-MICHELLE-RAGO/Ceremony.jpg",
  "ANGUILLA-MICHELLE-RAGO/Ceremony_2.jpg",
  "ANGUILLA-MICHELLE-RAGO/Islamic_Ceremony.jpg",
  // Cocktail → tent → reception
  "ANGUILLA-MICHELLE-RAGO/Wedding_Cocktail_Hour.jpg",
  "ANGUILLA-MICHELLE-RAGO/Tent_Entrance.jpg",
  "ANGUILLA-MICHELLE-RAGO/Wedding_Lounge.jpg",
  "ANGUILLA-MICHELLE-RAGO/Wedding_Reception.jpg",
  "ANGUILLA-MICHELLE-RAGO/Wedding_Reception_2.jpg",
  "ANGUILLA-MICHELLE-RAGO/Sangeet_Dining_Close_Up.jpg",
  // Bankie Banks night
  "ANGUILLA-MICHELLE-RAGO/Bankie_Banks_Flag.jpg",
  "ANGUILLA-MICHELLE-RAGO/Bankie_Banks.jpg",
  "ANGUILLA-MICHELLE-RAGO/Bankie_Banks_2.jpg",
  "ANGUILLA-MICHELLE-RAGO/Bankie_Banks_3_Favorite_.jpg",
  "ANGUILLA-MICHELLE-RAGO/Bankie_Banks_4_Favorite_.jpg",
  "ANGUILLA-MICHELLE-RAGO/Bankie_Banks_Bar.jpg",
  "ANGUILLA-MICHELLE-RAGO/Bankie_Banks_Lounge.jpg",
  "ANGUILLA-MICHELLE-RAGO/DJ.jpg",
  // Casino Night (late night)
  "ANGUILLA-MICHELLE-RAGO/Casino_Night.jpg",
  "ANGUILLA-MICHELLE-RAGO/Casino_Night_2.jpg",
  "ANGUILLA-MICHELLE-RAGO/Casino_Night_3.jpg",
  "ANGUILLA-MICHELLE-RAGO/Casino_Night_4.jpg",
] as const;

export const anguillaMicheleRagoGalleryHero: GalleryImage = {
  src: galleriesUrl("ANGUILLA-MICHELLE-RAGO/Wedding_Day_Lounge_by_the_Sea.jpg"),
  alt: "Sangeet long-table dining detail by the sea, Anguilla",
};

export const anguillaMicheleRagoGalleryImages = createGalleryImages([...anguillaMicheleRagoGalleryPaths], "Anguilla — Michelle Rago Destinations");

// Flow: Daytime activities (lunch + ride) → Carrie King Americana (day) → Hat branding/Westworld day → wedding party (N+B day shots) → Westworld Bar → Westworld Dinner Tablescape → Reception (evening) → Westworld Night → After Party
export const brushCreekLoveThisDayGalleryPaths = [
  // Daytime activities
  "BRUSH-CREEK-LOVE-THIS-DAY/Favorites__Erich_s_Main_Photos__Westworld_Day_Event.jpg",
  "BRUSH-CREEK-LOVE-THIS-DAY/Favorites__Erich_s_Main_Photos__WestWorld_Lunch.jpg",
  "BRUSH-CREEK-LOVE-THIS-DAY/Favorites__Erich_s_Main_Photos__WestWorld_Lunch_2.jpg",
  "BRUSH-CREEK-LOVE-THIS-DAY/Favorites__Erich_s_Main_Photos__WestWorld_Lunch_3.jpg",
  "BRUSH-CREEK-LOVE-THIS-DAY/Favorites__Erich_Add-Ons__00019-Natalie_BenLunchandActivities.jpg",
  "BRUSH-CREEK-LOVE-THIS-DAY/Favorites__Erich_s_Main_Photos__Daytime_Ride.jpg",
  "BRUSH-CREEK-LOVE-THIS-DAY/Favorites__Erich_s_Main_Photos__Daytime_Ride_2.jpg",
  // Carrie King — Americana Sweet Zion (day)
  "BRUSH-CREEK-LOVE-THIS-DAY/Favorites__Carrie_King_Favorites__Sweet_Zion_BCR-55.jpg",
  "BRUSH-CREEK-LOVE-THIS-DAY/Favorites__Carrie_King_Favorites__Sweet_Zion_BCR-421.jpg",
  "BRUSH-CREEK-LOVE-THIS-DAY/Favorites__Carrie_King_Favorites__Sweet_Zion_BCR-448.jpg",
  "BRUSH-CREEK-LOVE-THIS-DAY/Favorites__Carrie_King_Favorites__Sweet_Zion_BCR-450.jpg",
  "BRUSH-CREEK-LOVE-THIS-DAY/Favorites__Carrie_King_Favorites__Sweet_Zion_BCR-529.jpg",
  "BRUSH-CREEK-LOVE-THIS-DAY/Favorites__Carrie_King_Favorites__Sweet_Zion_BCR-614.jpg",
  "BRUSH-CREEK-LOVE-THIS-DAY/Favorites__Carrie_King_Favorites__Sweet_Zion_BCR-615.jpg",
  "BRUSH-CREEK-LOVE-THIS-DAY/Favorites__Carrie_King_Favorites__Sweet_Zion_BCR-625.jpg",
  "BRUSH-CREEK-LOVE-THIS-DAY/Favorites__Carrie_King_Favorites__Sweet_Zion_BCR-627.jpg",
  "BRUSH-CREEK-LOVE-THIS-DAY/Favorites__Carrie_King_Favorites__Sweet_Zion_BCR-628.jpg",
  "BRUSH-CREEK-LOVE-THIS-DAY/Favorites__Carrie_King_Favorites__Sweet_Zion_BCR-635.jpg",
  "BRUSH-CREEK-LOVE-THIS-DAY/Favorites__Carrie_King_Favorites__Sweet_Zion_BCR-636.jpg",
  "BRUSH-CREEK-LOVE-THIS-DAY/Favorites__Carrie_King_Favorites__Sweet_Zion_BCR-650.jpg",
  "BRUSH-CREEK-LOVE-THIS-DAY/Favorites__Carrie_King_Favorites__Sweet_Zion_BCR-660.jpg",
  "BRUSH-CREEK-LOVE-THIS-DAY/Favorites__Carrie_King_Favorites__Sweet_Zion_BCR-730.jpg",
  "BRUSH-CREEK-LOVE-THIS-DAY/Favorites__Carrie_King_Favorites__Sweet_Zion_BCR-762.jpg",
  "BRUSH-CREEK-LOVE-THIS-DAY/Favorites__Carrie_King_Favorites__Sweet_Zion_BCR-786.jpg",
  "BRUSH-CREEK-LOVE-THIS-DAY/Favorites__Carrie_King_Favorites__Sweet_Zion_BCR-787.jpg",
  // Westworld day → personal
  "BRUSH-CREEK-LOVE-THIS-DAY/Favorites__Erich_Add-Ons__Hat_Branding.jpg",
  "BRUSH-CREEK-LOVE-THIS-DAY/Favorites__Erich_Add-Ons__bride_and_the_flag.jpg",
  "BRUSH-CREEK-LOVE-THIS-DAY/Favorites__Erich_s_Main_Photos__WestWorld_Bride.jpg",
  "BRUSH-CREEK-LOVE-THIS-DAY/Favorites__Erich_s_Main_Photos__WestWorld_Couple.jpg",
  "BRUSH-CREEK-LOVE-THIS-DAY/Favorites__Erich_s_Main_Photos__Westworld_Couple_2.jpg",
  "BRUSH-CREEK-LOVE-THIS-DAY/Favorites__Erich_Add-Ons__Westworld_Couple_3.jpg",
  // N+B wedding sequence
  "BRUSH-CREEK-LOVE-THIS-DAY/Favorites__N_B_1.jpg",
  "BRUSH-CREEK-LOVE-THIS-DAY/Favorites__N_B_2.jpg",
  "BRUSH-CREEK-LOVE-THIS-DAY/Favorites__N_B_3.jpg",
  "BRUSH-CREEK-LOVE-THIS-DAY/Favorites__N_B_5.jpg",
  "BRUSH-CREEK-LOVE-THIS-DAY/Favorites__N_B_7.jpg",
  "BRUSH-CREEK-LOVE-THIS-DAY/Favorites__N_B_8.jpg",
  "BRUSH-CREEK-LOVE-THIS-DAY/Favorites__N_B_9.jpg",
  "BRUSH-CREEK-LOVE-THIS-DAY/Favorites__N_B_10.jpg",
  "BRUSH-CREEK-LOVE-THIS-DAY/Favorites__N_B_11.jpg",
  "BRUSH-CREEK-LOVE-THIS-DAY/Favorites__N_B_12.jpg",
  "BRUSH-CREEK-LOVE-THIS-DAY/Favorites__N_B_13.jpg",
  "BRUSH-CREEK-LOVE-THIS-DAY/Favorites__N_B_14.jpg",
  "BRUSH-CREEK-LOVE-THIS-DAY/Favorites__N_B_15.jpg",
  "BRUSH-CREEK-LOVE-THIS-DAY/Favorites__N_B_17jpg.jpg",
  "BRUSH-CREEK-LOVE-THIS-DAY/Favorites__N_B_18.jpg",
  "BRUSH-CREEK-LOVE-THIS-DAY/Favorites__Natalie_and_Be.jpg",
  // Westworld bar + lounge (cocktail)
  "BRUSH-CREEK-LOVE-THIS-DAY/Favorites__Erich_s_Main_Photos__WestWorld_Bar.jpg",
  "BRUSH-CREEK-LOVE-THIS-DAY/Favorites__Erich_s_Main_Photos__WestWorld_Bar_2.jpg",
  "BRUSH-CREEK-LOVE-THIS-DAY/Favorites__Erich_Add-Ons__Westworld_Lounge_Close_Up.jpg",
  "BRUSH-CREEK-LOVE-THIS-DAY/Favorites__Erich_Add-Ons__Wedding_Vintage_Trays.jpg",
  // Dinner / reception
  "BRUSH-CREEK-LOVE-THIS-DAY/Favorites__Erich_Add-Ons__Westworld_Dinner_Tablescape.jpg",
  "BRUSH-CREEK-LOVE-THIS-DAY/Favorites__Erich_Add-Ons__Westworld_Tunnel_Shot.jpg",
  "BRUSH-CREEK-LOVE-THIS-DAY/Favorites__Erich_Add-Ons__Westworld_Tunnel_Shot_Close_Up.jpg",
  "BRUSH-CREEK-LOVE-THIS-DAY/Favorites__Erich_s_Main_Photos__WestWorld_Reception.jpg",
  "BRUSH-CREEK-LOVE-THIS-DAY/Favorites__Erich_s_Main_Photos__WestWorld_Reception_2.jpg",
  "BRUSH-CREEK-LOVE-THIS-DAY/Favorites__Erich_s_Main_Photos__WestWorld_Reception_3.jpg",
  "BRUSH-CREEK-LOVE-THIS-DAY/Favorites__Erich_s_Main_Photos__WestWorld_Reception_4.jpg",
  "BRUSH-CREEK-LOVE-THIS-DAY/Favorites__Erich_s_Main_Photos__WestWorld_Reception_5.jpg",
  "BRUSH-CREEK-LOVE-THIS-DAY/Favorites__Erich_s_Main_Photos__WestWorld_Reception_6.jpg",
  // Night / after party
  "BRUSH-CREEK-LOVE-THIS-DAY/Favorites__Erich_s_Main_Photos__WestWorld_Night.jpg",
  "BRUSH-CREEK-LOVE-THIS-DAY/Favorites__Erich_s_Main_Photos__WestWorld_After_Party.jpg",
  "BRUSH-CREEK-LOVE-THIS-DAY/Favorites__Erich_s_Main_Photos__WestWorld_After_Party_2.jpg",
  "BRUSH-CREEK-LOVE-THIS-DAY/Favorites__Erich_s_Main_Photos__WestWorld_After_Party_Bride1.jpg",
  "BRUSH-CREEK-LOVE-THIS-DAY/Favorites__Erich_s_Main_Photos__After_Party.jpg",
  "BRUSH-CREEK-LOVE-THIS-DAY/Favorites__Erich_s_Main_Photos__After_Party_2.jpg",
] as const;

export const brushCreekLoveThisDayGalleryHero: GalleryImage = {
  src: galleriesUrl("BRUSH-CREEK-LOVE-THIS-DAY/Favorites__Erich_Add-Ons__Westworld_Lounge_Close_Up.jpg"),
  alt: "Westworld-inspired lounge detail, Brush Creek Ranch",
};

export const brushCreekLoveThisDayGalleryImages = createGalleryImages([...brushCreekLoveThisDayGalleryPaths], "Brush Creek Ranch — Love This Day");

// Flow: Sangeet (day → evening) → Wedding day finale
export const brushCreekDiwanGalleryPaths = [
  // Sangeet — day program
  "BRUSH-CREEK-DIWAN/Sangeet__2021_09_05_sapnaari-sp-0049.jpg",
  "BRUSH-CREEK-DIWAN/Sangeet__2021_09_05_sapnaari-sp-0050.jpg",
  "BRUSH-CREEK-DIWAN/Sangeet__2021_09_05_sapnaari-sp-0051.jpg",
  "BRUSH-CREEK-DIWAN/Sangeet__2021_09_05_sapnaari-sp-0052.jpg",
  "BRUSH-CREEK-DIWAN/Sangeet__2021_09_05_sapnaari-sp-0055.jpg",
  "BRUSH-CREEK-DIWAN/Sangeet__2021_09_05_sapnaari-sp-0062.jpg",
  "BRUSH-CREEK-DIWAN/Sangeet__2021_09_05_sapnaari-sp-0063.jpg",
  "BRUSH-CREEK-DIWAN/Sangeet__2021_09_05_sapnaari-sp-0069.jpg",
  "BRUSH-CREEK-DIWAN/Sangeet__2021_09_05_sapnaari-sp-0071.jpg",
  "BRUSH-CREEK-DIWAN/Sangeet__2021_09_05_sapnaari-sp-0072.jpg",
  // Sangeet large — evening décor
  "BRUSH-CREEK-DIWAN/Sangeet__Large_Images__2021_09_05_sapnaari-sp-0073.jpg",
  "BRUSH-CREEK-DIWAN/Sangeet__Large_Images__2021_09_05_sapnaari-sp-0079.jpg",
  "BRUSH-CREEK-DIWAN/Sangeet__Large_Images__2021_09_05_sapnaari-sp-0083.jpg",
  "BRUSH-CREEK-DIWAN/Sangeet__Large_Images__2021_09_05_sapnaari-sp-0108.jpg",
  "BRUSH-CREEK-DIWAN/Sangeet__Large_Images__2021_09_05_sapnaari-sp-0116.jpg",
  "BRUSH-CREEK-DIWAN/Sangeet__Large_Images__2021_09_05_sapnaari-sp-0119.jpg",
  "BRUSH-CREEK-DIWAN/Sangeet__Large_Images__2021_09_05_sapnaari-sp-0123.jpg",
  "BRUSH-CREEK-DIWAN/Sangeet__Large_Images__2021_09_05_sapnaari-sp-0128.jpg",
  "BRUSH-CREEK-DIWAN/Sangeet__Large_Images__2021_09_05_sapnaari-sp-0130.jpg",
  "BRUSH-CREEK-DIWAN/Sangeet__Large_Images__2021_09_05_sapnaari-sp-0134.jpg",
  "BRUSH-CREEK-DIWAN/Sangeet__Large_Images__2021_09_05_sapnaari-sp-0139.jpg",
  // Wedding day finale
  "BRUSH-CREEK-DIWAN/Wedding__2021_09_05_sapnaari-sp-0130.jpg",
] as const;

export const brushCreekDiwanGalleryHero: GalleryImage = {
  src: galleriesUrl("BRUSH-CREEK-DIWAN/Wedding__2021_09_05_sapnaari-sp-0130.jpg"),
  alt: "Sangeet décor, Brush Creek Ranch",
};

export const brushCreekDiwanGalleryImages = createGalleryImages([...brushCreekDiwanGalleryPaths], "Brush Creek Ranch — Diwan by Design");

// Flow: Friday details (day prep) → Ceremony details → Cocktail Hour → Tent (night)
export const bishopsLodge42NorthGalleryPaths = [
  // Friday — day-of details
  "BISHOPS-LODGE-42-NORTH/Friday_-_Details__KGW-0371.jpg",
  "BISHOPS-LODGE-42-NORTH/Friday_-_Details__KGW-0372.jpg",
  "BISHOPS-LODGE-42-NORTH/Friday_-_Details__KGW-0373.jpg",
  "BISHOPS-LODGE-42-NORTH/Friday_-_Details__KGW-0374.jpg",
  "BISHOPS-LODGE-42-NORTH/Friday_-_Details__KGW-0375.jpg",
  // Ceremony details
  "BISHOPS-LODGE-42-NORTH/Details_-_Ceremony__KGW-1478.jpg",
  "BISHOPS-LODGE-42-NORTH/Details_-_Ceremony__KGW-1481.jpg",
  "BISHOPS-LODGE-42-NORTH/Details_-_Ceremony__KGW-1483.jpg",
  "BISHOPS-LODGE-42-NORTH/Details_-_Ceremony__KGW-1489.jpg",
  "BISHOPS-LODGE-42-NORTH/Details_-_Ceremony__KGW-1494.jpg",
  "BISHOPS-LODGE-42-NORTH/Details_-_Ceremony__KGW-1496.jpg",
  "BISHOPS-LODGE-42-NORTH/Details_-_Ceremony__KGW-1498.jpg",
  "BISHOPS-LODGE-42-NORTH/Details_-_Ceremony__KGW-1506.jpg",
  "BISHOPS-LODGE-42-NORTH/Details_-_Ceremony__KGW-1515.jpg",
  "BISHOPS-LODGE-42-NORTH/Details_-_Ceremony__KGW-1517.jpg",
  "BISHOPS-LODGE-42-NORTH/Details_-_Ceremony__KGW-1520.jpg",
  "BISHOPS-LODGE-42-NORTH/Details_-_Ceremony__KGW-1521.jpg",
  "BISHOPS-LODGE-42-NORTH/Details_-_Ceremony__KGW-1523.jpg",
  "BISHOPS-LODGE-42-NORTH/Details_-_Ceremony__KGW-1532.jpg",
  "BISHOPS-LODGE-42-NORTH/Details_-_Ceremony__KGW-1543.jpg",
  "BISHOPS-LODGE-42-NORTH/Details_-_Ceremony__KGW-1544.jpg",
  "BISHOPS-LODGE-42-NORTH/Details_-_Ceremony__KGW-1571.jpg",
  "BISHOPS-LODGE-42-NORTH/Details_-_Ceremony__KGW-1576.jpg",
  "BISHOPS-LODGE-42-NORTH/Details_-_Ceremony__KGW-1577.jpg",
  "BISHOPS-LODGE-42-NORTH/Details_-_Ceremony__KGW-1602.jpg",
  "BISHOPS-LODGE-42-NORTH/Details_-_Ceremony__KGW-1603.jpg",
  "BISHOPS-LODGE-42-NORTH/Details_-_Ceremony__KGW-1606.jpg",
  "BISHOPS-LODGE-42-NORTH/Details_-_Ceremony__KGW-1609.jpg",
  // Cocktail Hour — golden hour ascending
  "BISHOPS-LODGE-42-NORTH/Cocktail_Hour__KGW-1980.jpg",
  "BISHOPS-LODGE-42-NORTH/Cocktail_Hour__KGW-1983.jpg",
  "BISHOPS-LODGE-42-NORTH/Cocktail_Hour__KGW-1984.jpg",
  "BISHOPS-LODGE-42-NORTH/Cocktail_Hour__KGW-1994.jpg",
  "BISHOPS-LODGE-42-NORTH/Cocktail_Hour__KGW-1995.jpg",
  "BISHOPS-LODGE-42-NORTH/Cocktail_Hour__KGW-1996.jpg",
  "BISHOPS-LODGE-42-NORTH/Cocktail_Hour__KGW-1998.jpg",
  "BISHOPS-LODGE-42-NORTH/Cocktail_Hour__KGW-1999.jpg",
  "BISHOPS-LODGE-42-NORTH/Cocktail_Hour__KGW-2000.jpg",
  "BISHOPS-LODGE-42-NORTH/Cocktail_Hour__KGW-2005.jpg",
  "BISHOPS-LODGE-42-NORTH/Cocktail_Hour__KGW-2006.jpg",
  "BISHOPS-LODGE-42-NORTH/Cocktail_Hour__KGW-2007.jpg",
  "BISHOPS-LODGE-42-NORTH/Cocktail_Hour__KGW-2010.jpg",
  "BISHOPS-LODGE-42-NORTH/Cocktail_Hour__KGW-2012.jpg",
  "BISHOPS-LODGE-42-NORTH/Cocktail_Hour__KGW-2013.jpg",
  "BISHOPS-LODGE-42-NORTH/Cocktail_Hour__KGW-2014.jpg",
  "BISHOPS-LODGE-42-NORTH/Cocktail_Hour__KGW-2015.jpg",
  "BISHOPS-LODGE-42-NORTH/Cocktail_Hour__KGW-2017.jpg",
  "BISHOPS-LODGE-42-NORTH/Cocktail_Hour__KGW-2020.jpg",
  "BISHOPS-LODGE-42-NORTH/Cocktail_Hour__KGW-2021.jpg",
  "BISHOPS-LODGE-42-NORTH/Cocktail_Hour__KGW-2022.jpg",
  "BISHOPS-LODGE-42-NORTH/Cocktail_Hour__KGW-2023.jpg",
  "BISHOPS-LODGE-42-NORTH/Cocktail_Hour__KGW-2024.jpg",
  "BISHOPS-LODGE-42-NORTH/Cocktail_Hour__KGW-2196.jpg",
  "BISHOPS-LODGE-42-NORTH/Cocktail_Hour__KGW-2198.jpg",
  "BISHOPS-LODGE-42-NORTH/Cocktail_Hour__KGW-2223.jpg",
  "BISHOPS-LODGE-42-NORTH/Cocktail_Hour__KGW-2240.jpg",
  "BISHOPS-LODGE-42-NORTH/Cocktail_Hour__KGW-2271.jpg",
  "BISHOPS-LODGE-42-NORTH/Cocktail_Hour__KGW-2272.jpg",
  "BISHOPS-LODGE-42-NORTH/Cocktail_Hour__KGW-2275.jpg",
  "BISHOPS-LODGE-42-NORTH/Cocktail_Hour__KGW-2278.jpg",
  "BISHOPS-LODGE-42-NORTH/Cocktail_Hour__KGW-2286.jpg",
  "BISHOPS-LODGE-42-NORTH/Cocktail_Hour__KGW-2288.jpg",
  "BISHOPS-LODGE-42-NORTH/Cocktail_Hour__KGW-2293.jpg",
  // Tent — night reception finale
  "BISHOPS-LODGE-42-NORTH/Details_-_Tent__KGW-2294.jpg",
  "BISHOPS-LODGE-42-NORTH/Details_-_Tent__KGW-2295.jpg",
  "BISHOPS-LODGE-42-NORTH/Details_-_Tent__KGW-2296.jpg",
  "BISHOPS-LODGE-42-NORTH/Details_-_Tent__KGW-2297.jpg",
  "BISHOPS-LODGE-42-NORTH/Details_-_Tent__KGW-2298.jpg",
  "BISHOPS-LODGE-42-NORTH/Details_-_Tent__KGW-2299.jpg",
  "BISHOPS-LODGE-42-NORTH/Details_-_Tent__KGW-2300.jpg",
  "BISHOPS-LODGE-42-NORTH/Details_-_Tent__KGW-2301.jpg",
  "BISHOPS-LODGE-42-NORTH/Details_-_Tent__KGW-2302.jpg",
  "BISHOPS-LODGE-42-NORTH/Details_-_Tent__KGW-2303.jpg",
] as const;

export const bishopsLodge42NorthGalleryHero: GalleryImage = {
  src: galleriesUrl("BISHOPS-LODGE-42-NORTH/Cocktail_Hour__KGW-2005.jpg"),
  alt: "Cocktail hour detail, Bishop's Lodge",
};

export const bishopsLodge42NorthGalleryImages = createGalleryImages([...bishopsLodge42NorthGalleryPaths], "Bishop's Lodge — 42 North");

export const encoreBostonDiwanGalleryPaths = [
  "ENCORE-BOSTON-DIWAN/2500px__web_size___1-KT-Merry-Photography-Sapna-Ari-Wedding.jpg",
  "ENCORE-BOSTON-DIWAN/2500px__web_size___10-KT-Merry-Photography-Sapna-Ari-Wedding.jpg",
  "ENCORE-BOSTON-DIWAN/2500px__web_size___11-KT-Merry-Photography-Sapna-Ari-Wedding.jpg",
  "ENCORE-BOSTON-DIWAN/2500px__web_size___12-KT-Merry-Photography-Sapna-Ari-Wedding.jpg",
  "ENCORE-BOSTON-DIWAN/2500px__web_size___13-KT-Merry-Photography-Sapna-Ari-Wedding.jpg",
  "ENCORE-BOSTON-DIWAN/2500px__web_size___14-KT-Merry-Photography-Sapna-Ari-Wedding.jpg",
  "ENCORE-BOSTON-DIWAN/2500px__web_size___15-KT-Merry-Photography-Sapna-Ari-Wedding.jpg",
  "ENCORE-BOSTON-DIWAN/2500px__web_size___16-KT-Merry-Photography-Sapna-Ari-Wedding.jpg",
  "ENCORE-BOSTON-DIWAN/2500px__web_size___17-KT-Merry-Photography-Sapna-Ari-Wedding.jpg",
  "ENCORE-BOSTON-DIWAN/2500px__web_size___18-KT-Merry-Photography-Sapna-Ari-Wedding.jpg",
  "ENCORE-BOSTON-DIWAN/2500px__web_size___19-KT-Merry-Photography-Sapna-Ari-Wedding.jpg",
  "ENCORE-BOSTON-DIWAN/2500px__web_size___2-KT-Merry-Photography-Sapna-Ari-Wedding.jpg",
  "ENCORE-BOSTON-DIWAN/2500px__web_size___20-KT-Merry-Photography-Sapna-Ari-Wedding.jpg",
  "ENCORE-BOSTON-DIWAN/2500px__web_size___21-KT-Merry-Photography-Sapna-Ari-Wedding.jpg",
  "ENCORE-BOSTON-DIWAN/2500px__web_size___22-KT-Merry-Photography-Sapna-Ari-Wedding.jpg",
  "ENCORE-BOSTON-DIWAN/2500px__web_size___23-KT-Merry-Photography-Sapna-Ari-Wedding.jpg",
  "ENCORE-BOSTON-DIWAN/2500px__web_size___24-KT-Merry-Photography-Sapna-Ari-Wedding.jpg",
  "ENCORE-BOSTON-DIWAN/2500px__web_size___25-KT-Merry-Photography-Sapna-Ari-Wedding.jpg",
  "ENCORE-BOSTON-DIWAN/2500px__web_size___26-KT-Merry-Photography-Sapna-Ari-Wedding.jpg",
  "ENCORE-BOSTON-DIWAN/2500px__web_size___3-KT-Merry-Photography-Sapna-Ari-Wedding.jpg",
  "ENCORE-BOSTON-DIWAN/2500px__web_size___4-KT-Merry-Photography-Sapna-Ari-Wedding.jpg",
  "ENCORE-BOSTON-DIWAN/2500px__web_size___5-KT-Merry-Photography-Sapna-Ari-Wedding.jpg",
  "ENCORE-BOSTON-DIWAN/2500px__web_size___6-KT-Merry-Photography-Sapna-Ari-Wedding.jpg",
  "ENCORE-BOSTON-DIWAN/2500px__web_size___7-KT-Merry-Photography-Sapna-Ari-Wedding.jpg",
  "ENCORE-BOSTON-DIWAN/2500px__web_size___8-KT-Merry-Photography-Sapna-Ari-Wedding.jpg",
  "ENCORE-BOSTON-DIWAN/2500px__web_size___9-KT-Merry-Photography-Sapna-Ari-Wedding.jpg",
] as const;

export const encoreBostonDiwanGalleryHero: GalleryImage = {
  src: galleriesUrl("ENCORE-BOSTON-DIWAN/2500px__web_size___1-KT-Merry-Photography-Sapna-Ari-Wedding.jpg"),
  alt: "Encore Boston celebration environment",
};

export const encoreBostonDiwanGalleryImages = createGalleryImages([...encoreBostonDiwanGalleryPaths], "The Encore — Diwan by Design");

export const privateResidenceTxCinergyGalleryPaths = [
  "PRIVATE-RESIDENCE-TX-CINERGY/124_04-06-24_NelsonWedding_PREVIEW.jpg",
  "PRIVATE-RESIDENCE-TX-CINERGY/128_04-06-24_NelsonWedding_PREVIEW.jpg",
  "PRIVATE-RESIDENCE-TX-CINERGY/134_04-06-24_NelsonWedding_PREVIEW.jpg",
  "PRIVATE-RESIDENCE-TX-CINERGY/136_04-06-24_NelsonWedding_PREVIEW.jpg",
  "PRIVATE-RESIDENCE-TX-CINERGY/141_04-06-24_NelsonWedding_PREVIEW.jpg",
  "PRIVATE-RESIDENCE-TX-CINERGY/142_04-06-24_NelsonWedding_PREVIEW.jpg",
  "PRIVATE-RESIDENCE-TX-CINERGY/147_04-06-24_NelsonWedding_PREVIEW.jpg",
  "PRIVATE-RESIDENCE-TX-CINERGY/149_04-06-24_NelsonWedding_PREVIEW.jpg",
  "PRIVATE-RESIDENCE-TX-CINERGY/193_04-06-24_NelsonWedding_PREVIEW.jpg",
] as const;

export const privateResidenceTxCinergyGalleryHero: GalleryImage = {
  src: galleriesUrl("PRIVATE-RESIDENCE-TX-CINERGY/124_04-06-24_NelsonWedding_PREVIEW.jpg"),
  alt: "Private residence wedding environment, Texas",
};

export const privateResidenceTxCinergyGalleryImages = createGalleryImages([...privateResidenceTxCinergyGalleryPaths], "Private Residence, TX — Cinergy Works");

// Flow: Property/setup (day-lit Blackberry series) → reception sequence (numbered) → night close
export const blackberryFarmsEastonGalleryPaths = [
  "BLACKBERRY-FARMS-EASTON/Blackberry_1.jpg",
  "BLACKBERRY-FARMS-EASTON/Blackberry_2.jpg",
  "BLACKBERRY-FARMS-EASTON/Blackberry_3.jpg",
  "BLACKBERRY-FARMS-EASTON/Blackberry_4.jpg",
  "BLACKBERRY-FARMS-EASTON/Blackberry_5.jpg",
  "BLACKBERRY-FARMS-EASTON/Blackberry_6.jpg",
  "BLACKBERRY-FARMS-EASTON/2022_12_03_victoriasean_sp_0240.jpg",
  "BLACKBERRY-FARMS-EASTON/2022_12_03_victoriasean_2200.jpg",
  "BLACKBERRY-FARMS-EASTON/2022_12_03_victoriasean_2203.jpg",
  "BLACKBERRY-FARMS-EASTON/2022_12_03_victoriasean_2218.jpg",
  "BLACKBERRY-FARMS-EASTON/2022_12_03_victoriasean_2258.jpg",
  "BLACKBERRY-FARMS-EASTON/2022_12_03_victoriasean_2259.jpg",
  "BLACKBERRY-FARMS-EASTON/2022_12_03_victoriasean_2267.jpg",
] as const;

export const blackberryFarmsEastonGalleryHero: GalleryImage = {
  src: galleriesUrl("BLACKBERRY-FARMS-EASTON/2022_12_03_victoriasean_2200.jpg"),
  alt: "Blackberry Farms winter wedding environment",
};

export const blackberryFarmsEastonGalleryImages = createGalleryImages([...blackberryFarmsEastonGalleryPaths], "Blackberry Farms — Easton Events");

// Flow: Wellness (morning) → Welcome Party (day) → Rehearsal Dinner (evening) → Wedding Day (climax → night)
export const fourSeasonsVailCassieLamereGalleryPaths = [
  // Wellness — morning
  "FOUR-SEASONS-VAIL-CASSIE-LAMERE/AP_Wellness01.jpg",
  "FOUR-SEASONS-VAIL-CASSIE-LAMERE/AP_Wellness02.jpg",
  "FOUR-SEASONS-VAIL-CASSIE-LAMERE/AP_Wellness03.jpg",
  "FOUR-SEASONS-VAIL-CASSIE-LAMERE/AP_Wellness13.jpg",
  "FOUR-SEASONS-VAIL-CASSIE-LAMERE/AP_Wellness19.jpg",
  "FOUR-SEASONS-VAIL-CASSIE-LAMERE/AP_Wellness23.jpg",
  "FOUR-SEASONS-VAIL-CASSIE-LAMERE/AP_Wellness25.jpg",
  "FOUR-SEASONS-VAIL-CASSIE-LAMERE/AP_Wellness25__1_.jpg",
  "FOUR-SEASONS-VAIL-CASSIE-LAMERE/AP_Wellness28.jpg",
  // Welcome Party — day/evening
  "FOUR-SEASONS-VAIL-CASSIE-LAMERE/WelcomeParty113.jpg",
  "FOUR-SEASONS-VAIL-CASSIE-LAMERE/WelcomeParty115.jpg",
  "FOUR-SEASONS-VAIL-CASSIE-LAMERE/WelcomeParty127.jpg",
  "FOUR-SEASONS-VAIL-CASSIE-LAMERE/WelcomeParty128.jpg",
  "FOUR-SEASONS-VAIL-CASSIE-LAMERE/WelcomeParty153.jpg",
  "FOUR-SEASONS-VAIL-CASSIE-LAMERE/WelcomeParty156.jpg",
  "FOUR-SEASONS-VAIL-CASSIE-LAMERE/WelcomeParty166.jpg",
  "FOUR-SEASONS-VAIL-CASSIE-LAMERE/WelcomeParty221.jpg",
  // Rehearsal Dinner — evening
  "FOUR-SEASONS-VAIL-CASSIE-LAMERE/RehearsalDinner001.jpg",
  "FOUR-SEASONS-VAIL-CASSIE-LAMERE/RehearsalDinner004.jpg",
  "FOUR-SEASONS-VAIL-CASSIE-LAMERE/RehearsalDinner005.jpg",
  "FOUR-SEASONS-VAIL-CASSIE-LAMERE/RehearsalDinner009.jpg",
  "FOUR-SEASONS-VAIL-CASSIE-LAMERE/RehearsalDinner011.jpg",
  "FOUR-SEASONS-VAIL-CASSIE-LAMERE/RehearsalDinner054.jpg",
  "FOUR-SEASONS-VAIL-CASSIE-LAMERE/RehearsalDinner066.jpg",
  "FOUR-SEASONS-VAIL-CASSIE-LAMERE/RehearsalDinner105.jpg",
  "FOUR-SEASONS-VAIL-CASSIE-LAMERE/RehearsalDinner106.jpg",
  "FOUR-SEASONS-VAIL-CASSIE-LAMERE/RehearsalDinner109.jpg",
  "FOUR-SEASONS-VAIL-CASSIE-LAMERE/RehearsalDinner112.jpg",
  "FOUR-SEASONS-VAIL-CASSIE-LAMERE/RehearsalDinner113.jpg",
  "FOUR-SEASONS-VAIL-CASSIE-LAMERE/RehearsalDinner144.jpg",
  // Wedding Day — ascending through ceremony / reception / night
  "FOUR-SEASONS-VAIL-CASSIE-LAMERE/AP_WeddingDay0311.jpg",
  "FOUR-SEASONS-VAIL-CASSIE-LAMERE/AP_WeddingDay0314.jpg",
  "FOUR-SEASONS-VAIL-CASSIE-LAMERE/AP_WeddingDay0316.jpg",
  "FOUR-SEASONS-VAIL-CASSIE-LAMERE/AP_WeddingDay0320.jpg",
  "FOUR-SEASONS-VAIL-CASSIE-LAMERE/AP_WeddingDay0321.jpg",
  "FOUR-SEASONS-VAIL-CASSIE-LAMERE/AP_WeddingDay0324.jpg",
  "FOUR-SEASONS-VAIL-CASSIE-LAMERE/AP_WeddingDay0325.jpg",
  "FOUR-SEASONS-VAIL-CASSIE-LAMERE/AP_WeddingDay0329.jpg",
  "FOUR-SEASONS-VAIL-CASSIE-LAMERE/AP_WeddingDay0338.jpg",
  "FOUR-SEASONS-VAIL-CASSIE-LAMERE/AP_WeddingDay0339.jpg",
  "FOUR-SEASONS-VAIL-CASSIE-LAMERE/AP_WeddingDay0350.jpg",
  "FOUR-SEASONS-VAIL-CASSIE-LAMERE/AP_WeddingDay0472.jpg",
  "FOUR-SEASONS-VAIL-CASSIE-LAMERE/AP_WeddingDay0613.jpg",
  "FOUR-SEASONS-VAIL-CASSIE-LAMERE/AP_WeddingDay0616.jpg",
  "FOUR-SEASONS-VAIL-CASSIE-LAMERE/AP_WeddingDay0618.jpg",
  "FOUR-SEASONS-VAIL-CASSIE-LAMERE/AP_WeddingDay0621.jpg",
  "FOUR-SEASONS-VAIL-CASSIE-LAMERE/AP_WeddingDay0624.jpg",
  "FOUR-SEASONS-VAIL-CASSIE-LAMERE/AP_WeddingDay0627.jpg",
  "FOUR-SEASONS-VAIL-CASSIE-LAMERE/AP_WeddingDay0628.jpg",
  "FOUR-SEASONS-VAIL-CASSIE-LAMERE/AP_WeddingDay0629.jpg",
  "FOUR-SEASONS-VAIL-CASSIE-LAMERE/AP_WeddingDay0630.jpg",
  "FOUR-SEASONS-VAIL-CASSIE-LAMERE/AP_WeddingDay0631.jpg",
  "FOUR-SEASONS-VAIL-CASSIE-LAMERE/AP_WeddingDay0632.jpg",
  "FOUR-SEASONS-VAIL-CASSIE-LAMERE/AP_WeddingDay0642.jpg",
  "FOUR-SEASONS-VAIL-CASSIE-LAMERE/AP_WeddingDay0643.jpg",
  "FOUR-SEASONS-VAIL-CASSIE-LAMERE/AP_WeddingDay0646.jpg",
  "FOUR-SEASONS-VAIL-CASSIE-LAMERE/AP_WeddingDay0668.jpg",
  "FOUR-SEASONS-VAIL-CASSIE-LAMERE/AP_WeddingDay0669.jpg",
  "FOUR-SEASONS-VAIL-CASSIE-LAMERE/AP_WeddingDay0672.jpg",
  "FOUR-SEASONS-VAIL-CASSIE-LAMERE/AP_WeddingDay0673.jpg",
  "FOUR-SEASONS-VAIL-CASSIE-LAMERE/AP_WeddingDay0674.jpg",
  "FOUR-SEASONS-VAIL-CASSIE-LAMERE/AP_WeddingDay0675.jpg",
  "FOUR-SEASONS-VAIL-CASSIE-LAMERE/AP_WeddingDay0676.jpg",
  "FOUR-SEASONS-VAIL-CASSIE-LAMERE/AP_WeddingDay0677.jpg",
  "FOUR-SEASONS-VAIL-CASSIE-LAMERE/AP_WeddingDay0678.jpg",
  "FOUR-SEASONS-VAIL-CASSIE-LAMERE/AP_WeddingDay0680.jpg",
  "FOUR-SEASONS-VAIL-CASSIE-LAMERE/AP_WeddingDay0683.jpg",
  "FOUR-SEASONS-VAIL-CASSIE-LAMERE/AP_WeddingDay0688.jpg",
  "FOUR-SEASONS-VAIL-CASSIE-LAMERE/AP_WeddingDay0694.jpg",
  "FOUR-SEASONS-VAIL-CASSIE-LAMERE/AP_WeddingDay0698.jpg",
  "FOUR-SEASONS-VAIL-CASSIE-LAMERE/AP_WeddingDay0700.jpg",
  "FOUR-SEASONS-VAIL-CASSIE-LAMERE/AP_WeddingDay0719.jpg",
  "FOUR-SEASONS-VAIL-CASSIE-LAMERE/AP_WeddingDay0731.jpg",
  "FOUR-SEASONS-VAIL-CASSIE-LAMERE/AP_WeddingDay0732.jpg",
  "FOUR-SEASONS-VAIL-CASSIE-LAMERE/AP_WeddingDay0744.jpg",
  "FOUR-SEASONS-VAIL-CASSIE-LAMERE/AP_WeddingDay0996.jpg",
  "FOUR-SEASONS-VAIL-CASSIE-LAMERE/AP_WeddingDay0998.jpg",
  "FOUR-SEASONS-VAIL-CASSIE-LAMERE/AP_WeddingDay0999.jpg",
  "FOUR-SEASONS-VAIL-CASSIE-LAMERE/AP_WeddingDay1000.jpg",
  "FOUR-SEASONS-VAIL-CASSIE-LAMERE/AP_WeddingDay1009.jpg",
  "FOUR-SEASONS-VAIL-CASSIE-LAMERE/AP_WeddingDay1012.jpg",
] as const;

export const fourSeasonsVailCassieLamereGalleryHero: GalleryImage = {
  src: galleriesUrl("FOUR-SEASONS-VAIL-CASSIE-LAMERE/WelcomeParty113.jpg"),
  alt: "Welcome party environment, Four Seasons Vail",
};

export const fourSeasonsVailCassieLamereGalleryImages = createGalleryImages([...fourSeasonsVailCassieLamereGalleryPaths], "Four Seasons Vail — Cassie LaMere Events");

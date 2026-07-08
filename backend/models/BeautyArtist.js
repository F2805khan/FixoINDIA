import { SupabaseModel } from "./SupabaseModel.js";

class BeautyArtist extends SupabaseModel {
  static get tableName() {
    return "beauty_artists";
  }
}

export default BeautyArtist;

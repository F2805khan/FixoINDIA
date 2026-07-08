import { SupabaseModel } from "./SupabaseModel.js";

class Service extends SupabaseModel {
  static get tableName() {
    return "services";
  }

  /**
   * Map app-code column names → original DB column names.
   * services table original cols: service_name, image_url, service_area, is_active
   */
  static get columnMap() {
    return {
      title: "service_name",
      image: "image_url",
      region: "service_area",
      enabled: "is_active"
    };
  }
}

export default Service;

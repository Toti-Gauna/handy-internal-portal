import { filterSpecialists, filterUsers, paginate, type PageResult, type SpecialistSearch, type UserRecord, type UserSearch } from "../domain/directories.ts";
import type { SpecialistRecord } from "../domain/specialists.ts";
import { demoSpecialists, demoUsers } from "./demo-data.ts";

export interface PortalDataSource {
  searchSpecialists(filters: SpecialistSearch): Promise<PageResult<SpecialistRecord>>;
  searchUsers(filters: UserSearch): Promise<PageResult<UserRecord>>;
}

/** Local-only source. Its rows are synthetic and must never back operational use. */
export class DemoPortalDataSource implements PortalDataSource {
  async searchSpecialists(filters: SpecialistSearch): Promise<PageResult<SpecialistRecord>> {
    return paginate(filterSpecialists(demoSpecialists, filters), filters.page, filters.pageSize);
  }

  async searchUsers(filters: UserSearch): Promise<PageResult<UserRecord>> {
    return paginate(filterUsers(demoUsers, filters), filters.page, filters.pageSize);
  }
}

export class PendingPortalDataSource implements PortalDataSource {
  async searchSpecialists(_filters: SpecialistSearch): Promise<PageResult<SpecialistRecord>> {
    throw new Error("Lectura operativa pendiente de TECH-03, TECH-06 y TECH-08.");
  }

  async searchUsers(_filters: UserSearch): Promise<PageResult<UserRecord>> {
    throw new Error("Lectura operativa pendiente de TECH-03, TECH-06 y TECH-08.");
  }
}

export type DataBasic = Record<string, unknown>;
export type Id = string;
export type IdData = { id: Id };
export type VersionData = IdData & { version: number };
export type CreatedChamadoData = { codigo: string };
export type FindData = { id: Id; data: DataBasic };
export type FindAllData = FindData[];
export type Status = "EM ANDAMENTO" | "AGUARDANDO" | "FINALIZADO";
export type UserLevel = "Dev" | "Gestor" | "Basic";
export type SuccessStatus = 200 | 201;
export type FailureStatus = 400 | 401 | 403 | 404 | 409 | 500;

export type SerializedError = {
  name: string;
  message: string;
};

export type Success<T> = {
  success: true;
  status: SuccessStatus;
  message: string;
  data: T;
  error: null;
};

export type Failure = {
  success: false;
  status: FailureStatus;
  message: string;
  data: null;
  error: SerializedError;
};

export type Result<T> = Success<T> | Failure;

export type ClientInfo = {
  name: string;
  contact: string;
};

export type User = {
  id: Id;
  name: string;
  contact: string;
  level: UserLevel;
  active: boolean;
  password_hash: string;
  version: number;
};

export type PublicUser = Omit<User, "password_hash">;
export type AppEnv = { Variables: { current_user: PublicUser } };
export type TokenPayload = { user_id: Id; exp: number };
export type UserActor = Pick<PublicUser, "id" | "name" | "contact" | "level">;
export type Actor = ClientInfo | UserActor;

export type CreateUser = Omit<User, "id" | "password_hash" | "version"> & {
  password: string;
};

export type LoginData = {
  contact: string;
  password: string;
};

export type AuthData = {
  token: string;
  user: PublicUser;
};

export type LogAction =
  | "CRIADO"
  | "CAPTURADO"
  | "MENSAGEM ENVIADA"
  | "FINALIZADO";

export type ChamadoMessage = {
  id: Id;
  chamado_id: Id;
  message: string;
  user: Actor;
  created: Date;
};

export type Chamado = {
  id: Id;
  codigo: string;
  user_resp: PublicUser | null;
  client: ClientInfo;
  status: Status;
  active: boolean;
  details: string[] | null;
  messages: ChamadoMessage[];
  created: Date;
  updated: Date;
  version: number;
};

export type ChamadoSummary = Omit<Chamado, "messages">;

export type CreateChamado = {
  client: ClientInfo;
  message: string;
  details?: string[];
};
export type NewChamado = Omit<Chamado, "id" | "messages" | "version">;
export type UpdateChamado = Partial<
  Pick<Chamado, "user_resp" | "status" | "updated">
>;
export type CreateMessage = { message: string };

export type QueryValue = string | number | boolean | null;
export type FindFilters =
  | Record<string, QueryValue>
  | Record<string, QueryValue>[];
export type TableName =
  | "users"
  | "chamados"
  | "chamado_messages"
  | "chamado_logs";
export type FindOptions = {
  filters?: FindFilters;
  limit?: number | null;
  offset?: number;
};

export interface DBAdapter {
  findById(id: Id): Promise<Result<FindData>>;
  findOne(filters: Record<string, QueryValue>): Promise<Result<FindData>>;
  findAll(options?: FindOptions): Promise<Result<FindAllData>>;
  save(data: DataBasic): Promise<Result<VersionData>>;
  update(
    id: Id,
    data: DataBasic,
    expected_version: number,
  ): Promise<Result<VersionData>>;
}

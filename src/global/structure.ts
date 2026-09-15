export type DataBasic = Record<string, unknown>;
export type Id = string;
export type IdData = { id: Id };
export type VersionData = IdData & { version: number };
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

export const ResponseMessage = {
  200: "Operação realizada com sucesso",
  201: "Registro criado com sucesso",
  400: "Erro na requisição",
  401: "Autenticação necessária",
  403: "Usuário sem permissão",
  404: "Registro não encontrado",
  409: "Registro alterado por outra operação",
  500: "Erro interno",
} as const;

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
export type UserActor = Pick<PublicUser, "id" | "name" | "contact" | "level">;
export type Actor = ClientInfo | UserActor;

export type CreateUser = Omit<User, "id" | "password_hash" | "version"> & {
  password: string;
};

export type UpdateUser =
  & Partial<
    Pick<User, "name" | "contact" | "level" | "active">
  >
  & {
    password?: string;
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
  | "ATUALIZADO"
  | "FINALIZADO"
  | "DESATIVADO"
  | "APAGADO";

export type ChamadoLog = {
  id: Id;
  chamado_id: Id;
  action: LogAction;
  message: string;
  user: Actor;
  created: Date;
};

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

export type CreateChamado =
  & Omit<
    Chamado,
    "id" | "version" | "messages"
  >
  & {
    messages: CreateMessage[];
  };
export type UpdateChamado = Partial<
  Omit<Chamado, "id" | "messages" | "version">
>;
export type CreateMessage = { message: string };

export type QueryValue = string | number | boolean | null;
export type FindOptions = {
  filters?: Record<string, QueryValue>;
  limit?: number;
  offset?: number;
};

export type Row = {
  id: string;
  data: string;
};

export interface DBAdapter {
  findById(id: Id): Promise<Result<FindData>>;
  findOne(filters: Record<string, QueryValue>): Promise<Result<FindData>>;
  findAll(options?: FindOptions): Promise<Result<FindAllData>>;
  save(data: DataBasic): Promise<Result<VersionData>>;
  delete(id: Id): Promise<Result<IdData>>;
  update(
    id: Id,
    data: DataBasic,
    expected_version: number,
  ): Promise<Result<VersionData>>;
}

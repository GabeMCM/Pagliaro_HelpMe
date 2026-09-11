export type DataBasic = Record<string, unknown>;
export type Id = string;
export type IdData = { id: Id };
export type FindData = { id: Id; data: DataBasic };
export type Status = "EM ANDAMENTO" | "AGUARDANDO" | "FINALIZADO";
export type UserLevel = "Dev" | "Gestor" | "Basic";

export type Log = {
  user: ClientInfo | User
  data: Date
  time: Date
}

export type Messages = {
  message: string
  log: Log
}

export type Row = {
  id: string;
  data: string;
};

export const ResponseMessage = {
  200: "Operação realizada com sucesso",
  201: "Registro criado com sucesso",
  400: "Erro na requisição",
  403: "Usuário sem permissão",
  404: "Registro não encontrado",
  500: "Erro interno",
} as const;

export type MessageResult =
  | typeof ResponseMessage[keyof typeof ResponseMessage]
  | string;

export type Success<T> = {
  success: true;
  message: MessageResult;
  data: T;
  error: null;
};

export type Failure = {
  success: false;
  message: MessageResult;
  data: null;
  error: Error;
};

export type ClientInfo = {
  name: string;
  contact: string;
}

export type Result<T> = Success<T> | Failure;

export type User = {
  id: Id;
  name: string;
  contact: string;
  level: UserLevel;
  active: boolean;
}

export type Chamado = {
  id: Id;
  codigo: string; //id externo entregue ao cliente para localizar chamado em consultas
  userResp: User | null
  client: ClientInfo;
  status: Status;
  active: boolean;
  details: string[] | null;
  messages: Record<Id, Messages>;
  created: Date;
  updated: Date;
}

export interface DBAdapter {
  findById( id: Id ): Promise<Result<FindData>>;
  save( data: DataBasic ): Promise<Result<IdData>>;
  delete( id: Id ): Promise<Result<IdData>>;
  update(id: Id, data: DataBasic): Promise<Result<IdData>>;
}

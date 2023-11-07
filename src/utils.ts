type GroupConfig = {
  name: string;
  aliases: string[];
  sync: boolean;
  ids_to_listen_on: string[];
};

export type Config = {
  name: string;
  ip: string;
  username: string;
  password: string;
  mqtt: {
    ip: string;
    port: number;
    username: string;
    password: string;
  };
  groups: GroupConfig[];
};

export const defaultConfig: Config = {
  name: 'MiLight ESP',
  ip: '',
  username: '',
  password: '',
  mqtt: {
    ip: '',
    port: 1883,
    username: '',
    password: '',
  },
  groups: [],
};

export const defaultGroupConfig: GroupConfig = {
  name: '',
  sync: false,
  aliases: [],
  ids_to_listen_on: [],
};


export const PASSWORD_ENV = 'WORKSHOP_TEST_USER_PASSWORD';
export const PASSWORD_PLACEHOLDER = `<redacted:${PASSWORD_ENV}>`;

export const PASSWORD_RESOURCE_PROPERTIES = [
  {
    logicalId: 'AIDLCPlatformAuthCreateTestUser0B287436',
    property: 'TemporaryPassword',
  },
  {
    logicalId: 'AIDLCPlatformAuthSetTestUserPasswordB46754D5',
    property: 'Password',
  },
] as const;

export const PASSWORD_OUTPUT = 'AIDLCPlatformPassword';

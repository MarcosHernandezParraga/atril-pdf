// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
import { requestPersistentStorage } from '../../platform/persistentStorage';

describe('persistent storage for the web version', () => {
  it('asks the browser when the data is not protected yet', async () => {
    const persist = jest.fn(async () => true);
    const persisted = jest.fn(async () => false);
    await expect(requestPersistentStorage({ persist, persisted })).resolves.toBe(true);
    expect(persist).toHaveBeenCalledTimes(1);
  });

  it('does not ask again when it is already protected', async () => {
    const persist = jest.fn(async () => true);
    await expect(requestPersistentStorage({ persist, persisted: async () => true })).resolves.toBe(true);
    expect(persist).not.toHaveBeenCalled();
  });

  it('reports a refusal', async () => {
    await expect(
      requestPersistentStorage({ persist: async () => false, persisted: async () => false }),
    ).resolves.toBe(false);
  });

  it('works in browsers without the feature or when it fails', async () => {
    await expect(requestPersistentStorage(undefined)).resolves.toBe(false);
    await expect(requestPersistentStorage({})).resolves.toBe(false);
    await expect(
      requestPersistentStorage({
        persist: async () => {
          throw new Error('blocked');
        },
      }),
    ).resolves.toBe(false);
  });
});

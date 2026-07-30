(function initializeProjectStore(global) {
  "use strict";

  function createProjectStore(options = {}) {
    const indexedDb = options.indexedDB || global.indexedDB;
    const dbName = options.dbName;
    const dbVersion = options.dbVersion;
    const autosaveStoreName = options.autosaveStoreName;
    const autosaveKey = options.autosaveKey;
    const libraryMetaStoreName = options.libraryMetaStoreName;
    const libraryDataStoreName = options.libraryDataStoreName;

    function openDatabase() {
      return new Promise((resolve, reject) => {
        if (!indexedDb) {
          reject(new Error("当前环境不支持 IndexedDB。"));
          return;
        }
        const request = indexedDb.open(dbName, dbVersion);
        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains(autosaveStoreName)) db.createObjectStore(autosaveStoreName);
          const metaStore = db.objectStoreNames.contains(libraryMetaStoreName)
            ? request.transaction.objectStore(libraryMetaStoreName)
            : db.createObjectStore(libraryMetaStoreName, { keyPath: "id" });
          if (!metaStore.indexNames.contains("updatedAt")) metaStore.createIndex("updatedAt", "updatedAt");
          if (!db.objectStoreNames.contains(libraryDataStoreName)) {
            db.createObjectStore(libraryDataStoreName, { keyPath: "id" });
          }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
        request.onblocked = () => reject(new Error("图纸库正在被其他页面使用，请关闭旧页面后重试。"));
      });
    }

    function requestResult(request) {
      return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    }

    function transactionDone(transaction) {
      return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error || new Error("本地存储事务失败。"));
        transaction.onabort = () => reject(transaction.error || new Error("本地存储事务已取消。"));
      });
    }

    async function writeAutosave(record) {
      const db = await openDatabase();
      try {
        const transaction = db.transaction(autosaveStoreName, "readwrite");
        transaction.objectStore(autosaveStoreName).put(record, autosaveKey);
        await transactionDone(transaction);
      } finally {
        db.close();
      }
    }

    async function readAutosave() {
      const db = await openDatabase();
      try {
        const transaction = db.transaction(autosaveStoreName, "readonly");
        const record = await requestResult(transaction.objectStore(autosaveStoreName).get(autosaveKey));
        await transactionDone(transaction);
        return record || null;
      } finally {
        db.close();
      }
    }

    async function clearAutosave() {
      const db = await openDatabase();
      try {
        const transaction = db.transaction(autosaveStoreName, "readwrite");
        transaction.objectStore(autosaveStoreName).delete(autosaveKey);
        await transactionDone(transaction);
      } finally {
        db.close();
      }
    }

    async function saveLibraryProject(meta, payloadRecord) {
      const db = await openDatabase();
      try {
        const transaction = db.transaction([libraryMetaStoreName, libraryDataStoreName], "readwrite");
        transaction.objectStore(libraryMetaStoreName).put(meta);
        transaction.objectStore(libraryDataStoreName).put(payloadRecord);
        await transactionDone(transaction);
      } finally {
        db.close();
      }
    }

    async function listLibraryProjectMeta() {
      const db = await openDatabase();
      try {
        const transaction = db.transaction(libraryMetaStoreName, "readonly");
        const records = await requestResult(transaction.objectStore(libraryMetaStoreName).getAll());
        await transactionDone(transaction);
        return records.sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
      } finally {
        db.close();
      }
    }

    async function readLibraryProject(id) {
      const db = await openDatabase();
      try {
        const transaction = db.transaction(libraryDataStoreName, "readonly");
        const record = await requestResult(transaction.objectStore(libraryDataStoreName).get(id));
        await transactionDone(transaction);
        return record?.payload || null;
      } finally {
        db.close();
      }
    }

    async function removeLibraryProject(id) {
      const db = await openDatabase();
      try {
        const transaction = db.transaction([libraryMetaStoreName, libraryDataStoreName], "readwrite");
        transaction.objectStore(libraryMetaStoreName).delete(id);
        transaction.objectStore(libraryDataStoreName).delete(id);
        await transactionDone(transaction);
      } finally {
        db.close();
      }
    }

    return Object.freeze({
      clearAutosave,
      listLibraryProjectMeta,
      openDatabase,
      readAutosave,
      readLibraryProject,
      removeLibraryProject,
      saveLibraryProject,
      writeAutosave,
    });
  }

  global.XiaomaiProjectStore = Object.freeze({
    createProjectStore,
  });
})(window);

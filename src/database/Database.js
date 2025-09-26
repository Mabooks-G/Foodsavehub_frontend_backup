class Database {
  static testConnection() {
    console.log('Simulating database call...');
    return { status: 'ok', time: new Date() };
  }
}

export default Database;

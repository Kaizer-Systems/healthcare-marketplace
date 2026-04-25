export class ExternalSyncAdapter {
  async pushToSellerErp(_sellerId: string, _data: unknown): Promise<void> {}
  async pullFromSellerErp(_sellerId: string): Promise<unknown> {
    return null;
  }
}

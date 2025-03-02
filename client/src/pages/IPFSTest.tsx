import { Layout } from "@/components/Layout";
import { IPFSStorage } from "@/components/IPFSStorage";

export default function IPFSTest() {
  return (
    <Layout>
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-6">IPFS Upload Test</h1>
        <p className="text-muted-foreground mb-8">
          This page allows you to test uploading files to IPFS via Pinata. Select an audio file to upload.
        </p>
        
        <IPFSStorage />
      </div>
    </Layout>
  );
}

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAccount } from 'wagmi';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Upload, Download, Loader2, File } from "lucide-react";
import { uploadFile, getFileBuffer, checkFileAvailability } from "@/lib/storage";
import { useIntl } from 'react-intl';
import { EditSongDialog } from "./EditSongDialog";
import { apiRequest } from "@/lib/queryClient";

interface UploadedFile {
  id: string;
  hash: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: string;
}

export function IPFSStorage() {
  const [uploadLoading, setUploadLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { address } = useAccount();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const intl = useIntl();

  // Query for listing files
  const { data: uploadedFiles = [], isLoading } = useQuery<UploadedFile[]>({
    queryKey: ["/api/songs/my-uploads"],
    enabled: !!address,
  });

  // Handle initial file selection
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !address) {
      toast({
        title: "Error",
        description: "Please select a valid audio file and connect your wallet",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
    setDialogOpen(true);
  };

  // Handle the actual file upload after metadata input
  const handleFileUpload = async (metadata: { title: string; artist: string }) => {
    if (!selectedFile || !address) return;

    try {
      setUploadLoading(true);
      console.log('Starting file upload:', {
        name: selectedFile.name,
        size: `${(selectedFile.size / (1024 * 1024)).toFixed(2)}MB`,
        type: selectedFile.type,
        address: address
      });

      // Upload to IPFS using the storage.ts utility
      const result = await uploadFile(selectedFile, {
        title: metadata.title,
        artist: metadata.artist,
        fileSize: selectedFile.size,
        mimeType: selectedFile.type,
        uploadedBy: address,
      });

      // Register the uploaded file in our database
      await apiRequest('POST', '/api/songs', {
        body: {
          title: metadata.title,
          artist: metadata.artist,
          ipfsHash: result.hash,
        }
      });

      console.log('Upload completed successfully:', result);

      queryClient.invalidateQueries({ queryKey: ["/api/songs/my-uploads"] });
      toast({
        title: "Success",
        description: "Your file has been uploaded to IPFS",
      });

      // Reset state
      setSelectedFile(null);
      setDialogOpen(false);
    } catch (error) {
      console.error('Upload error details:', error);

      // Handle specific error types
      let errorMessage = error instanceof Error ? error.message : "An unknown error occurred";

      // Check for timeout or network errors
      if (error instanceof Error) {
        if (errorMessage.includes('timeout')) {
          errorMessage = 'Upload timed out. Please try again with a smaller file.';
        } else if (errorMessage.includes('network')) {
          errorMessage = 'Network error occurred. Please check your connection and try again.';
        }
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setUploadLoading(false);
    }
  };

  // Handle file download
  const handleDownload = async (file: { hash: string; name: string }) => {
    try {
      const buffer = await getFileBuffer(file.hash);
      const blob = new Blob([buffer]);
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Success",
        description: "File downloaded successfully",
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Error",
        description: "Failed to download file",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">IPFS Storage</h2>
        <div className="flex items-center gap-4">
          <Input
            type="file"
            onChange={handleFileSelect}
            accept="audio/mpeg,audio/mp3,audio/wav,audio/ogg"
            id="ipfs-upload"
            className="hidden"
            disabled={uploadLoading}
          />
          <label htmlFor="ipfs-upload">
            <Button variant="outline" asChild disabled={uploadLoading}>
              <span>
                {uploadLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload
                  </>
                )}
              </span>
            </Button>
          </label>
        </div>
      </div>

      {/* Metadata Input Dialog */}
      <EditSongDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mode="create"
        onSubmit={handleFileUpload}
      />

      <div className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : uploadedFiles.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            You haven't uploaded any files yet
          </p>
        ) : (
          <div className="grid gap-4">
            {uploadedFiles.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between p-4 rounded-lg border bg-card"
              >
                <div className="flex items-center space-x-4">
                  <File className="h-8 w-8 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDownload(file)}
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default IPFSStorage;

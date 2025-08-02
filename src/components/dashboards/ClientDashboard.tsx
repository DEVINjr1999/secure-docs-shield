import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Upload, Eye, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function ClientDashboard() {
  const navigate = useNavigate();

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Document Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            My Documents
          </CardTitle>
          <CardDescription>
            Manage your legal documents and contracts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Button 
              className="w-full justify-start"
              onClick={() => navigate('/app/upload')}
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload New Document
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => navigate('/app/documents')}
            >
              <Eye className="h-4 w-4 mr-2" />
              View My Documents
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <Download className="h-4 w-4 mr-2" />
              Document Templates
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>
            Your latest document activities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">
              No recent activity
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Document Status */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Document Status Overview</CardTitle>
          <CardDescription>
            Track the status of your submitted documents
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-primary">0</div>
              <div className="text-sm text-muted-foreground">Pending Review</div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-green-600">0</div>
              <div className="text-sm text-muted-foreground">Approved</div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-red-600">0</div>
              <div className="text-sm text-muted-foreground">Needs Revision</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
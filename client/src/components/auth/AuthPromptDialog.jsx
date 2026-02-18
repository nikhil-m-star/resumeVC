import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useNavigate } from "react-router-dom"
import { Lock } from "lucide-react"

export function AuthPromptDialog({ open, onOpenChange, title, description }) {
    const navigate = useNavigate()

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit mb-4">
                        <Lock className="h-6 w-6 text-primary" />
                    </div>
                    <DialogTitle className="text-center">{title || "Account Required"}</DialogTitle>
                    <DialogDescription className="text-center">
                        {description || "Create an account to save your resume, access AI features, and sync across devices."}
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="flex-col gap-2 sm:flex-col">
                    <Button
                        className="w-full"
                        onClick={() => navigate('/register')}
                    >
                        Create Free Account
                    </Button>
                    <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => navigate('/login')}
                    >
                        Sign In
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

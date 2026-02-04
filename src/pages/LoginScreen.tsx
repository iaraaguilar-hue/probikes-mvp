import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Lock, User } from "lucide-react";

interface LoginScreenProps {
    onLogin: (username: string) => void;
}

// Simulated User Database
const USERS = [
    { username: "admin", password: "probikes2026" },
    { username: "luis", password: "tarmacsl8" },
    { username: "demo", password: "demo123" }
];

export default function LoginScreen({ onLogin }: LoginScreenProps) {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Simple validation against "DB"
        const validUser = USERS.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password);

        if (validUser) {
            onLogin(validUser.username);
        } else {
            setError(true);
            setPassword("");
        }
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <Card className="w-full max-w-md shadow-2xl border-orange-100">
                <CardHeader className="flex flex-col items-center space-y-4 pb-2">
                    <div className="w-full flex justify-center py-6">
                        <img
                            src="/img/logo_full.png"
                            alt="ProBikes"
                            className="h-16 object-contain"
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">

                        {/* Username */}
                        <div className="space-y-2">
                            <div className="relative">
                                <User className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                                <Input
                                    type="text"
                                    placeholder="Usuario"
                                    className="pl-10 h-12 text-lg"
                                    value={username}
                                    onChange={(e) => {
                                        setUsername(e.target.value);
                                        setError(false);
                                    }}
                                    autoFocus
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div className="space-y-2">
                            <div className="relative">
                                <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                                <Input
                                    type="password"
                                    placeholder="Contraseña"
                                    className={`pl-10 h-12 text-lg ${error ? "border-red-500 ring-red-500" : ""}`}
                                    value={password}
                                    onChange={(e) => {
                                        setPassword(e.target.value);
                                        setError(false);
                                    }}
                                />
                            </div>
                            {error && (
                                <p className="text-sm text-red-500 font-medium text-center animate-pulse">
                                    Credenciales incorrectas
                                </p>
                            )}
                        </div>

                        <Button
                            type="submit"
                            className="w-full h-12 text-lg bg-orange-600 hover:bg-orange-700 text-white font-bold transition-all"
                        >
                            INGRESAR
                        </Button>

                        <div className="text-center pt-4 opacity-0 hover:opacity-100 transition-opacity">
                            {/* Hint for demo */}
                            <p className="text-[10px] text-gray-300">Tips: admin/probikes2026, luis/tarmacsl8, demo/demo123</p>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}

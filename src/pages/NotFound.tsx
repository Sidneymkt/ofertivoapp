
import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { BackButton } from "@/components/BackButton";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">404</h1>
        <p className="text-xl text-gray-600 mb-6">Oops! Página não encontrada</p>
        <div className="flex gap-4 justify-center">
          <BackButton 
            to="/" 
            label="Voltar ao Início" 
            variant="outline"
            size="default"
          />
          <a href="/" className="text-blue-500 hover:text-blue-700 underline">
            Página Inicial
          </a>
        </div>
      </div>
    </div>
  );
};

export default NotFound;

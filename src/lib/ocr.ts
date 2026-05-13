import Tesseract from 'tesseract.js';

/**
 * Busca por padrões de placa brasileira em um texto.
 * Pode ser Mercosul (ABC1D23) ou antiga (ABC-1234).
 */
export const extractLicensePlate = (text: string): string | null => {
  // Limpeza super agressiva: mantém apenas letras e números
  const cleanText = text.replace(/[^A-Za-z0-9]/g, '');
  
  // Buscar um padrão que tenha 3 Letras, seguido de 4 caracteres alfanuméricos (no mínimo 1 numero no começo e 2 numeros no fim)
  // Mercosul: LLLNLNN
  // Antiga: LLLNNNN
  const regex = /([A-Z]{3})([0-9][A-Z0-9][0-9]{2})/i;
  
  const match = cleanText.match(regex);
  if (match) {
    const plate = `${match[1]}${match[2]}`.toUpperCase();
    return plate;
  }
  
  // Caso a placa esteja muito confusa, mas tenha 7 caracteres sequenciais
  // Tentar um fallback menos estrito: 7 caracteres alfanuméricos contínuos
  const fallbackRegex = /([A-Z0-9]{7})/i;
  const fallbackMatch = cleanText.match(fallbackRegex);
  if (fallbackMatch && /[A-Z]/.test(fallbackMatch[1]) && /[0-9]/.test(fallbackMatch[1])) {
    return fallbackMatch[1].toUpperCase();
  }
  
  return null;
}

export const recognizePlateFromImage = async (imageUrl: string): Promise<string | null> => {
  try {
    // O idioma 'eng' (inglês) é o melhor e mais rápido para ler letras e números simples
    const result = await Tesseract.recognize(
      imageUrl,
      'eng',
      {
        logger: info => console.log("OCR Progress:", info)
      }
    );
    
    return extractLicensePlate(result.data.text);
  } catch (error) {
    console.error("Erro no OCR:", error);
    return null;
  }
}

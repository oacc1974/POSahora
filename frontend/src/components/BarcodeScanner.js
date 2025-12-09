import React, { useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';

export default function BarcodeScanner({ open, onClose, onScan }) {
  const scannerRef = useRef(null);

  useEffect(() => {
    if (open && !scannerRef.current) {
      const timer = setTimeout(() => {
        const element = document.getElementById('scanner-container');
        if (!element) {
          console.warn('Scanner container not found');
          return;
        }

        const config = {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          supportedScanTypes: [0, 1],
        };

        const scanner = new Html5QrcodeScanner('scanner-container', config, false);

        scanner.render(
          (decodedText, decodedResult) => {
            onScan({ text: decodedText, format: decodedResult.result.format });
            scanner.clear();
            scannerRef.current = null;
          },
          (error) => {
            console.warn('Scanner error:', error);
          }
        );

        scannerRef.current = scanner;
      }, 100);

      return () => clearTimeout(timer);
    }

    return () => {
      if (scannerRef.current && !open) {
        scannerRef.current.clear().catch(console.error);
        scannerRef.current = null;
      }
    };
  }, [open, onScan]);

  const handleClose = () => {
    if (scannerRef.current) {
      scannerRef.current.clear().catch(console.error);
      scannerRef.current = null;
    }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="max-w-md"
        data-testid="barcode-scanner-dialog"
      >
        <DialogHeader>
          <DialogTitle>Escanear Código de Barras</DialogTitle>
        </DialogHeader>

        <div className="scanner-overlay rounded-xl overflow-hidden">
          <div id="scanner-container" className="w-full" />
        </div>

        <p className="text-sm text-center text-slate-600">
          Apunta la cámara al código de barras del producto
        </p>
      </DialogContent>
    </Dialog>
  );
}

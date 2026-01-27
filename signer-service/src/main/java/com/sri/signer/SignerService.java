package com.sri.signer;

import static spark.Spark.*;
import com.google.gson.Gson;
import com.google.gson.JsonObject;
import java.io.*;
import java.security.*;
import java.security.cert.*;
import java.util.Base64;
import javax.xml.parsers.*;
import javax.xml.transform.*;
import javax.xml.transform.dom.*;
import javax.xml.transform.stream.*;
import org.w3c.dom.*;
import org.xml.sax.InputSource;
import xades4j.algorithms.EnvelopedSignatureTransform;
import xades4j.production.*;
import xades4j.properties.DataObjectDesc;
import xades4j.providers.*;
import xades4j.providers.impl.*;

public class SignerService {
    
    private static final Gson gson = new Gson();
    
    public static void main(String[] args) {
        int port = 8003;
        port(port);
        
        System.out.println("Iniciando servicio de firma XAdES en puerto " + port);
        
        // Health check
        get("/health", (req, res) -> {
            res.type("application/json");
            return "{\"status\": \"ok\", \"service\": \"xades-signer\"}";
        });
        
        // Endpoint para firmar XML
        post("/sign", (req, res) -> {
            res.type("application/json");
            
            try {
                JsonObject input = gson.fromJson(req.body(), JsonObject.class);
                
                String xmlBase64 = input.get("xml").getAsString();
                String p12Base64 = input.get("p12").getAsString();
                String password = input.get("password").getAsString();
                
                // Decodificar XML
                String xmlContent = new String(Base64.getDecoder().decode(xmlBase64), "UTF-8");
                byte[] p12Data = Base64.getDecoder().decode(p12Base64);
                
                // Firmar
                String signedXml = signXml(xmlContent, p12Data, password);
                
                JsonObject result = new JsonObject();
                result.addProperty("success", true);
                result.addProperty("signed_xml", Base64.getEncoder().encodeToString(signedXml.getBytes("UTF-8")));
                
                return gson.toJson(result);
                
            } catch (Exception e) {
                e.printStackTrace();
                JsonObject error = new JsonObject();
                error.addProperty("success", false);
                error.addProperty("error", e.getMessage());
                res.status(500);
                return gson.toJson(error);
            }
        });
        
        System.out.println("Servicio de firma iniciado en http://localhost:" + port);
    }
    
    private static String signXml(String xmlContent, byte[] p12Data, String password) throws Exception {
        // Cargar el certificado PKCS12
        KeyStore keyStore = KeyStore.getInstance("PKCS12");
        keyStore.load(new ByteArrayInputStream(p12Data), password.toCharArray());
        
        // Obtener alias del certificado
        String alias = keyStore.aliases().nextElement();
        
        // Crear el proveedor de certificado
        KeyingDataProvider kdp = new DirectKeyingDataProvider(
            (X509Certificate) keyStore.getCertificate(alias),
            (PrivateKey) keyStore.getKey(alias, password.toCharArray())
        );
        
        // Configurar el perfil XAdES-BES
        XadesSigningProfile profile = new XadesBesSigningProfile(kdp);
        
        // Crear el firmador
        XadesSigner signer = profile.newSigner();
        
        // Parsear el documento XML
        DocumentBuilderFactory dbf = DocumentBuilderFactory.newInstance();
        dbf.setNamespaceAware(true);
        DocumentBuilder db = dbf.newDocumentBuilder();
        Document doc = db.parse(new InputSource(new StringReader(xmlContent)));
        
        // Obtener el elemento raíz
        Element elementToSign = doc.getDocumentElement();
        
        // Asegurarse de que el elemento tenga un ID
        String idAttr = elementToSign.getAttribute("id");
        if (idAttr == null || idAttr.isEmpty()) {
            idAttr = "comprobante";
            elementToSign.setAttribute("id", idAttr);
            elementToSign.setIdAttribute("id", true);
        } else {
            elementToSign.setIdAttribute("id", true);
        }
        
        // Crear referencia al elemento a firmar
        DataObjectDesc dataObj = new DataObjectReference("#" + idAttr)
            .withTransform(new EnvelopedSignatureTransform());
        
        // Firmar
        SignedDataObjects dataObjs = new SignedDataObjects(dataObj);
        signer.sign(dataObjs, elementToSign);
        
        // Convertir a String
        TransformerFactory tf = TransformerFactory.newInstance();
        Transformer transformer = tf.newTransformer();
        transformer.setOutputProperty(OutputKeys.ENCODING, "UTF-8");
        transformer.setOutputProperty(OutputKeys.OMIT_XML_DECLARATION, "no");
        
        StringWriter writer = new StringWriter();
        transformer.transform(new DOMSource(doc), new StreamResult(writer));
        
        return writer.toString();
    }
}

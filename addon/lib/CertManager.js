/*
    Responsible for managing cert data
*/
let {
    Cc, Ci
} = require('chrome');

const nsIX509CertDB = Ci.nsIX509CertDB;
const nsX509CertDB = "@mozilla.org/security/x509certdb;1";
const nsIX509Cert = Ci.nsIX509Cert;

const nsICertificateDialogs = Ci.nsICertificateDialogs;
const nsCertificateDialogs = "@mozilla.org/nsCertificateDialogs;1"

const nsIFilePicker = Ci.nsIFilePicker;
const nsFilePicker = "@mozilla.org/filepicker;1";
const gCertFileTypes = "*.p7b; *.crt; *.cert; *.cer; *.pem; *.der";

const nsDialogParamBlock = "@mozilla.org/embedcomp/dialogparam;1";
const nsIDialogParamBlock = Ci.nsIDialogParamBlock;

const nsILocalFile = Ci.nsILocalFile;
const nsIFileOutputStream = Ci.nsIFileOutputStream;

var SFD = require("./SalesForceData.js");
var tabs = require('sdk/tabs');
var ss = require("sdk/simple-storage");
var certManagerJson = SFD.getJSON();

function getCM() {

    var CertManager = {};

    CertManager.distrustAuth = function(authInfo) {
        if (!('savedAuths' in ss.storage)) {
            ss.storage.savedAuths = {};
        }
        var authSavedTrusts = {};
        for( var certId in authInfo.certs ) {
            var cert = authInfo.certs[certId];
            var certTrust = {ssl: CertManager.isSSLTrust(cert), email: CertManager.isEmailTrust(cert), obj: CertManager.isObjTrust(cert) };
            CertManager.setCertTrusts(cert, false, false, false);
            authSavedTrusts[cert.commonName] = certTrust;
        }
        ss.storage.savedAuths[authInfo.name] = authSavedTrusts;
    }

    CertManager.entrustAuth = function(authInfo) {
        var certTrusts = ss.storage.savedAuths[authInfo.name];
        for( var certId in authInfo.certs ) {
            var cert = authInfo.certs[certId];
            var trust = certTrusts[cert.commonName];
            CertManager.setCertTrusts(cert, trust.ssl, trust.email, trust.obj);
        }
        delete ss.storage.savedAuths[authInfo.name];
    }

    CertManager.isBuiltinToken = function(tokenName) {
        return tokenName == "Builtin Object Token";
    }

    CertManager.isCertBuiltIn = function(cert) {
        let tokenNames = cert.getAllTokenNames({});
        if (!tokenNames) {
            return false;
        }
        if (tokenNames.some(CertManager.isBuiltinToken)) {
            return true;
        }
        return false;
    }

    CertManager.isTrusted = function(cert) {
        var certdb = Cc[nsX509CertDB].getService(nsIX509CertDB);
        var sslTrust = certdb.isCertTrusted(cert, Ci.nsIX509Cert.CA_CERT, Ci.nsIX509CertDB.TRUSTED_SSL);
        var emailTrust = certdb.isCertTrusted(cert, Ci.nsIX509Cert.CA_CERT, Ci.nsIX509CertDB.TRUSTED_EMAIL);
        var objTrust = certdb.isCertTrusted(cert, Ci.nsIX509Cert.CA_CERT, Ci.nsIX509CertDB.TRUSTED_OBJSIGN);
        return sslTrust || emailTrust || objTrust;
    }

    CertManager.isSSLTrust = function(cert) {
        var certdb = Cc[nsX509CertDB].getService(nsIX509CertDB);
        return certdb.isCertTrusted(cert, Ci.nsIX509Cert.CA_CERT, Ci.nsIX509CertDB.TRUSTED_SSL);
    }

    CertManager.isEmailTrust = function(cert) {
        var certdb = Cc[nsX509CertDB].getService(nsIX509CertDB);
        return certdb.isCertTrusted(cert, Ci.nsIX509Cert.CA_CERT, Ci.nsIX509CertDB.TRUSTED_EMAIL);
    }

    CertManager.isObjTrust = function(cert) {
        var certdb = Cc[nsX509CertDB].getService(nsIX509CertDB);
        return certdb.isCertTrusted(cert, Ci.nsIX509Cert.CA_CERT, Ci.nsIX509CertDB.TRUSTED_OBJSIGN);
    }

    CertManager.importCert = function() {
        var fp = Cc[nsFilePicker].createInstance(nsIFilePicker);
        var win = require("sdk/window/utils").getMostRecentBrowserWindow();
        fp.init(win,
            "Select File containing CA certificate(s) to import",
            nsIFilePicker.modeOpen);
        fp.appendFilter("Certificate Files",
            gCertFileTypes);
        fp.appendFilters(nsIFilePicker.filterAll);
        if (fp.show() == nsIFilePicker.returnOK) {
            var certdb = Cc[nsX509CertDB].getService(nsIX509CertDB);
            certdb.importCertsFromFile(null, fp.file, nsIX509Cert.CA_CERT);
            tabs.activeTab.reload();
        }
    }

    CertManager.deleteCert = function(cert) {
        var certdb = Cc[nsX509CertDB].getService(nsIX509CertDB);
        certdb.deleteCertificate(cert);
    }

    CertManager.exportCert = function(cert) {
        // var certdb = Cc[nsX509CertDB].getService(nsIX509CertDB);
        // certdb.deleteCertificate(cert);
        var fp = Cc[nsFilePicker].createInstance(nsIFilePicker);
        var win = require("sdk/window/utils").getMostRecentBrowserWindow();
        fp.init(win, "Save Certificate To File",
          nsIFilePicker.modeSave);
        var filename = cert.commonName;
        if (!filename.length)
            filename = cert.windowTitle;
        // remove all whitespace from the default filename
        fp.defaultString = filename.replace(/\s*/g,'');
        fp.defaultExtension = "crt";
        fp.appendFilter("X.509 Certificate (PEM)", "*.crt; *.pem");
        fp.appendFilter("X.509 Certificate with chain (PEM)", "*.crt; *.pem");
        fp.appendFilter("X.509 Certificate (DER)", "*.der");
        fp.appendFilter("X.509 Certificate (PKCS#7)", "*.p7c");
        fp.appendFilter("X.509 Certificate with chain (PKCS#7)", "*.p7c");
        fp.appendFilters(nsIFilePicker.filterAll);

        var res = fp.show();
        if (res != nsIFilePicker.returnOK && res != nsIFilePicker.returnReplace)
            return;

        var content = '';
        switch (fp.filterIndex) {
            case 1:
                content = getPEMString(cert);
                var chain = cert.getChain();
                for (var i = 1; i < chain.length; i++)
                    content += getPEMString(chain.queryElementAt(i, nsIX509Cert));
                break;
            case 2:
                content = getDERString(cert);
                break;
            case 3:
                content = getPKCS7String(cert, nsIX509Cert.CMS_CHAIN_MODE_CertOnly);
                break;
            case 4:
                content = getPKCS7String(cert, nsIX509Cert.CMS_CHAIN_MODE_CertChainWithRoot);
                break;
            case 0:
            default:
                content = getPEMString(cert);
                break;
        }

        var msg;
        var written = 0;

        try {
            var file = Cc["@mozilla.org/file/local;1"].
                       createInstance(nsILocalFile);
            file.initWithPath(fp.file.path);
            var fos = Cc["@mozilla.org/network/file-output-stream;1"].
                      createInstance(nsIFileOutputStream);
            // flags: PR_WRONLY | PR_CREATE_FILE | PR_TRUNCATE
            fos.init(file, 0x02 | 0x08 | 0x20, 00644, 0);
            written = fos.write(content, content.length);
            fos.close();
        } catch (e) {
            // switch (e.result) {
            //   case Components.results.NS_ERROR_FILE_ACCESS_DENIED:
            //     msg = "Access denied";
            //     break;
            //   case Components.results.NS_ERROR_FILE_IS_LOCKED:
            //     msg = "File is locked";
            //     break;
            //   case Components.results.NS_ERROR_FILE_NO_DEVICE_SPACE:
            //   case Components.results.NS_ERROR_FILE_DISK_FULL:
            //     msg = "No space left on device";
            //     break;
            //   default:
                msg = e.message;
            //     break;
            // }
        }

        // if (written != content.length) {
        //     if (!msg.length)
        //     msg = "Unknown error";
        //     alertPromptService("File Error",
        //                    bundle.getFormattedString("writeFileFailed",
        //                    [fp.file.path, msg]));
        // }
    }

	CertManager.viewCert = function(cert) {
		var cd = Cc[nsCertificateDialogs].getService(nsICertificateDialogs);
		cd.viewCert(null, cert);
	}

	CertManager.calculateTrust = function(cert,numCerts,score){
	//ASN1Structure ASN1_SEQUENCE = 16 --> SHA 256
	//enum for type of encryption https://dxr.mozilla.org/mozilla-central/source/dom/crypto/WebCryptoTask.cpp ->mOidTag == encrypting algorithm
	//https://dxr.mozilla.org/mozilla-central/source/dom/crypto/WebCryptoCommon.h#17
	// https://dxr.mozilla.org/mozilla-central/source/security/manager/locales/en-US/chrome/pipnss/pipnss.properties -- reverse search the descriptions to get an actual algorithm used with the enum in WebCrypto
		if(cert.ASN1Structure.ASN1_SEQUENCE == "16"){
			var t = ((score+10) / numCerts);
			return t.toFixed(1);
		}else{
			var t = score / numCerts;
			return t.toFixed(1);
		}
	}

    CertManager.setCertTrusts = function(cert, ssl, email, objsign) {
        console.log('Called setCertTrusts with:');
        console.log(cert);
        console.log(ssl)
        console.log(email)
        console.log(objsign)

        var certdb = Cc[nsX509CertDB].getService(nsIX509CertDB);
        var trustssl = (ssl) ? nsIX509CertDB.TRUSTED_SSL : 0;
        var trustemail = (email) ? nsIX509CertDB.TRUSTED_EMAIL : 0;
        var trustobjsign = (objsign) ? nsIX509CertDB.TRUSTED_OBJSIGN : 0;

        certdb.setCertTrust(cert, nsIX509Cert.CA_CERT, trustssl | trustemail | trustobjsign);
        return true;
    }

    CertManager.genCAData = function() {

        var certdb = Cc[nsX509CertDB].getService(nsIX509CertDB);
        var certcache = certdb.getCerts();
        var enumerator = certcache.getEnumerator();
        var authorities = {};

        while (enumerator.hasMoreElements()) {
            var cert =
                enumerator.getNext().QueryInterface(Ci.nsIX509Cert);
            if (cert.certType == nsIX509Cert.CA_CERT) {
                if (!(cert.issuerOrganization in authorities)) {
                    var source = CertManager.isCertBuiltIn(cert) ? "builtInCert" : "customCert";
                    var name = cert.issuerOrganization;
                    var trust = CertManager.calculateTrust(cert,1,90);
                    var last = (cert.issuerOrganization in certManagerJson) ? certManagerJson[cert.issuerOrganization].auditDate : "UNKNOWN";
                    var country = (cert.issuerOrganization in certManagerJson) ? certManagerJson[cert.issuerOrganization].geographicFocus : "UNKNOWN";
                    var trustbits = []
                    if (CertManager.isSSLTrust(cert)) {
                        trustbits.push("SSL");
                    } 
                    if (CertManager.isEmailTrust(cert)) {
                        trustbits.push("EMAIL");
                    }
                    if (CertManager.isObjTrust(cert)) {
                        trustbits.push("SOFTWARE");
                    }
                    trustbits = trustbits.join(", ");
                    var enabled = ('savedAuths' in ss.storage && name in ss.storage.savedAuths) ? false : true;
                    authorities[cert.issuerOrganization] = { source: source, name: name, trust: trust, last: last, country: country, bits: trustbits, certs: [cert], certCount: 1, trusted: enabled};
                } else {
                    var source = CertManager.isCertBuiltIn(cert) ? "builtInCert" : "customCert";
                    var name = cert.issuerOrganization;
                    var trust = CertManager.calculateTrust(cert,authorities[cert.issuerOrganization].certCount+1,authorities[cert.issuerOrganization].trust);
                    var last = (cert.issuerOrganization in certManagerJson) ? certManagerJson[cert.issuerOrganization].auditDate : "UNKNOWN";
                    var country = "UNKNOWN";

                    if (authorities[cert.issuerOrganization].source === "customCert") {
                        authorities[cert.issuerOrganization].source = source;
                    }
					authorities[cert.issuerOrganization].trust = trust;
                    if (authorities[cert.issuerOrganization].last === "UNKNOWN") {
                        authorities[cert.issuerOrganization].last = last;
                    }
                    if (authorities[cert.issuerOrganization].country === "UNKNOWN") {
                        authorities[cert.issuerOrganization].country = country;
                    }

                    var trusts = authorities[cert.issuerOrganization].bits.split(", ");
                    var trustbits = []
                    if (trusts.indexOf("SSL") > -1 || CertManager.isSSLTrust(cert)) {
                        trustbits.push("SSL");
                    } 
                    if (trusts.indexOf("EMAIL") > -1 || CertManager.isEmailTrust(cert)) {
                        trustbits.push("EMAIL");
                    }
                    if (trusts.indexOf("SOFTWARE") > -1 || CertManager.isObjTrust(cert)) {
                        trustbits.push("SOFTWARE");
                    }                    
                    trustbits = trustbits.join(", ");
                    authorities[cert.issuerOrganization].bits = trustbits;
                    authorities[cert.issuerOrganization].certs.push(cert);
					authorities[cert.issuerOrganization].certCount = authorities[cert.issuerOrganization].certCount;
                }
            }
        }

        var keys = [];
        var out = [];

        for (var auth in authorities) {
            keys.push(auth);
        }

        keys.sort(function(a, b) {
            return a.toLowerCase().localeCompare(b.toLowerCase());
        });

        for (var i = 0; i < keys.length; i++) {
            out.push(authorities[keys[i]]);
        }

        return out;
    }

    /* Utility Functions */

    function getPEMString(cert) {
      var derb64 = btoa(getDERString(cert));
      // Wrap the Base64 string into lines of 64 characters, 
      // with CRLF line breaks (as specified in RFC 1421).
      var wrapped = derb64.replace(/(\S{64}(?!$))/g, "$1\r\n");
      return "-----BEGIN CERTIFICATE-----\r\n"
             + wrapped
             + "\r\n-----END CERTIFICATE-----\r\n";        
    }

    function getDERString(cert) {
      var length = {};
      var derArray = cert.getRawDER(length);
      var derString = '';
      for (var i = 0; i < derArray.length; i++) {
        derString += String.fromCharCode(derArray[i]);
      }
      return derString;
    }

    function getPKCS7String(cert, chainMode) {
      var length = {};
      var pkcs7Array = cert.exportAsCMS(chainMode, length);
      var pkcs7String = '';
      for (var i = 0; i < pkcs7Array.length; i++) {
        pkcs7String += String.fromCharCode(pkcs7Array[i]);
      }
      return pkcs7String;
    }

    /**
    * Binary-compatible Base64 encoding.
    *
    * Taken from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Base64_encoding_and_decoding
    *
    * @param {Uint8Array} bytes The data to encode.
    * @return {String} The base64 encoded string.
    */
    function btoa(bytes) {
    var mod3 = 2;
    var result = "";
    var length = bytes.length;
    var uint24 = 0;

    for (var index = 0; index < length; index++) {
      mod3 = index % 3;
      if (index > 0 && (index * 4 / 3) % 76 === 0) {
        result += "\r\n";
      }
      uint24 |= bytes[index] << (16 >>> mod3 & 24);
      if (mod3 === 2 || length - index === 1) {
        result += String.fromCharCode(_uint6ToB64(uint24 >>> 18 & 63),
          _uint6ToB64(uint24 >>> 12 & 63),
          _uint6ToB64(uint24 >>> 6 & 63),
          _uint6ToB64(uint24 & 63));
        uint24 = 0;
      }
    }

    return result.substr(0, result.length - 2 + mod3) +
      (mod3 === 2 ? "" : mod3 === 1 ? "=" : "==");
    }

      /**
       * Utility function to encode an integer into a base64 character code.
       *
       * Taken from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Base64_encoding_and_decoding
       *
       * @param {Number} uint6 The number to encode.
       * @return {Number} The encoded value.
       */
      function _uint6ToB64(uint6) {
        return uint6 < 26 ? uint6 + 65 :
               uint6 < 52 ? uint6 + 71 :
               uint6 < 62 ? uint6 - 4 :
               uint6 === 62 ? 43 :
               uint6 === 63 ? 47 : 65;
      }

    return CertManager;
}

exports.getCM = getCM
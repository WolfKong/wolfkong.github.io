using Cysharp.Threading.Tasks;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Networking;
using Newtonsoft.Json;
using Newtonsoft.Json.Converters;
using SimpleJSON;
using System.Text;
using System;

namespace Sensorial.BackEnd
{
    public static class BackEndUtility
    {
        private static string _accessToken;
        private static IsoDateTimeConverter _dateTimeConverter;

        public static void Initialize(string accessToken)
        {
            _dateTimeConverter = new IsoDateTimeConverter { DateTimeFormat = "dd/MM/yyyy HH:mm:ss" };
            _accessToken = accessToken;
        }

        public static async UniTask<string> PostRequest(string uri, string bodyJson)
        {
            Debug.Log($"POST REQUEST-uri: {uri}, body: {bodyJson}");

            var webRequest = new UnityWebRequest(uri, "POST");
            webRequest.certificateHandler = new CustomCertificateHandler();

            byte[] bodyRaw = Encoding.UTF8.GetBytes(bodyJson);
            webRequest.uploadHandler = (UploadHandler)new UploadHandlerRaw(bodyRaw);
            webRequest.downloadHandler = (DownloadHandler)new DownloadHandlerBuffer();
            webRequest.SetRequestHeader("Content-Type", "application/json");
            webRequest.SetRequestHeader("Authorization", "Bearer " + _accessToken);

            try
            {
                await webRequest.SendWebRequest();
            }
            catch (Exception e)
            {
                Debug.LogWarning($"SendWebRequest error {e}");
            }

            if (webRequest.result == UnityWebRequest.Result.ProtocolError ||
                webRequest.result == UnityWebRequest.Result.ConnectionError)
            {
                Debug.LogWarning($"RequestError: {webRequest.downloadHandler.text}. uri: {uri}");
            }
            else
            {
                Debug.Log($"RequestSuccess- Code: {webRequest.responseCode}, Text: {webRequest.downloadHandler.text}");

                return webRequest.downloadHandler.text;
            }
            return string.Empty;
        }

        public static async UniTask<string> GetRequest(string uri)
        {
            Debug.Log($"GET REQUEST - uri: {uri}");

            using (UnityWebRequest webRequest = UnityWebRequest.Get(uri))
            {
                webRequest.certificateHandler = new CustomCertificateHandler();
                webRequest.SetRequestHeader("Authorization", "Bearer " + _accessToken);

                try
                {
                    await webRequest.SendWebRequest();
                }
                catch (Exception e)
                {
                    Debug.LogWarning($"SendWebRequest error {e}");
                }

                if (webRequest.result == UnityWebRequest.Result.ProtocolError ||
                    webRequest.result == UnityWebRequest.Result.ConnectionError)
                {
                    Debug.LogWarning($"RequestError: {webRequest.downloadHandler.text}. uri: {uri}");
                }
                else
                {
                    Debug.Log($"REQUEST Text: {webRequest.downloadHandler.text}");
                    return webRequest.downloadHandler.text;
                }
            }
            return string.Empty;
        }

        public static List<T> GetListFromJsonString<T>(string jsonString, string listName)
        {
            var json = JSON.Parse(jsonString);

            var objectList = new List<T>();

            if (json == null)
                return objectList;

            foreach (var obj in json[listName])
            {
                try
                {
                    var data = JsonConvert.DeserializeObject<T>(obj.Value.ToString(), _dateTimeConverter);
                    objectList.Add(data);
                }
                catch
                {
                    Debug.LogWarning($"Invalid {listName} Entry! {obj}");
                }
            }

            return objectList;
        }
    }
}

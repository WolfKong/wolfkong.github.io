using System;
using System.Collections.Generic;
using UnityEngine;
using Sensorial.Util;
using MooveInternal.Data;
using Cysharp.Threading.Tasks;
using TMPro;
using System.Linq;

namespace Sensorial.Minigames
{
    public class CodesearchMinigame : MonoBehaviour, IMinigame
    {
        [SerializeField] private CharacterGrid _characterGrid;
        [SerializeField] private Transform _codeContainer;
        [SerializeField] private TextMeshProUGUI _codePrefab;
        [SerializeField] private InputFeedback _inputFeedback;
        [SerializeField] private Color _codeFoundColor;

        private TextMeshProUGUI[] _codeTexts;

        private CognitiveExerciseData _data;
        private bool _searchComplete;
        private float _lastInputTime;
        private int _mistakesCount = 0;

        public event Action<int, int> OnSeriesStart;

        public int GetHits() => _codeList.Count;
        public int GetMistakes() => _mistakesCount;
        public float GetDuration() => MinigameHUD.GetDuration();

        private CodesearchResultParameters _result;
        public ResultParameters GetResultParameters() => _result;

        // MINIGAME PARAMETERS
        private int _codeCount = 8;

        private static readonly int[] CodeLengths = new int[] {3, 4, 5, 6, 2};
        private const CodeSearchDifficulty Difficulty = CodeSearchDifficulty.Diagonal;
        private const int RowCount = 7;
        private const int ColumnCount = 11;

        private List<string> _codeList;
        private List<bool> _codeFoundList;

        private void Awake()
        {
            _characterGrid.CodeInputed += OnCodeInputed;

            gameObject.SetActive(false);
        }

        private void OnDestroy()
        {
            _characterGrid.CodeInputed -= OnCodeInputed;
        }

        public void SetData(CognitiveExerciseData data)
        {
            _data = data;
            _result = new CodesearchResultParameters();

            _codeCount = Mathf.Clamp(data.Stimulus[0].Key, 3, 15);

            _searchComplete = false;
            _mistakesCount = 0;
        }

        protected MinigameHUD MinigameHUD;
        public virtual void SetHUD(MinigameHUD minigameHUD)
        {
            MinigameHUD = minigameHUD;
        }

        private void ResetGrid()
        {
            _characterGrid.ResetCharacterGrid();

            foreach (var obj in _codeTexts)
                Destroy(obj.gameObject);

            _codeTexts = null;
        }

        public async UniTask Run()
        {
            gameObject.SetActive(true);

            _codeList = CreateCodeList();
            _codeFoundList = new List<bool>();

            for (int i = 0; i < _codeList.Count; i++)
                _codeFoundList.Add(false);

            _characterGrid.CreateCharacterGrid(RowCount, ColumnCount, _codeList, Difficulty);
            CreateCodeDisplay();

            MinigameHUD.StartTimer(TimerPosition.BottomRight);
            _lastInputTime = Time.realtimeSinceStartup;

            await UniTask.WaitUntil(() => _searchComplete);

            MinigameHUD.StopTimer();

            ResetGrid();

            gameObject.SetActive(false);
        }

        private List<string> CreateCodeList()
        {
            var list = new List<string>();

            for (int i = 0; i < _codeCount; i++)
            {
                var codeLength = CodeLengths[i % CodeLengths.Length];
                list.Add(CreateCode(codeLength));
            }

            list.Sort(SortByLengthAscending);

            return list;
        }

        public int SortByLengthAscending(string str1, string str2)
        {
            return str1.Length.CompareTo(str2.Length);
        }

        private string CreateCode(int size)
        {
            var code = string.Empty;
            var characters = CharacterGrid.Characters;

            for (int i = 0; i < size; i++)
                code += characters[UnityEngine.Random.Range(0, characters.Length)];

            return code;
        }

        private void CreateCodeDisplay()
        {
            _codeTexts = new TextMeshProUGUI[_codeList.Count];

            for (int i = 0; i < _codeList.Count; i++)
            {
                var code = _codeList[i];
                var codeText = Instantiate(_codePrefab, _codeContainer);
                codeText.text = code;
                _codeTexts[i] = codeText;
            }
        }

        private void OnCodeInputed(int index, string inputedCode)
        {
            var success = CheckCode(inputedCode);
            DebugUtil.Log($"inputedCode{inputedCode}, SUCCESS {success}");

            var responseTime = Time.realtimeSinceStartup - _lastInputTime;
            _lastInputTime = Time.realtimeSinceStartup;

            UpdateResult(index, inputedCode, success, responseTime);

            if (success)
            {
                _characterGrid.CreateCorrectSelection();

                if (_codeFoundList.All(b => b))
                    _searchComplete = true;
            }
            else
            {
                _mistakesCount++;
                _characterGrid.CreateWrongSelection();
            }
        }

        private bool CheckCode(string code)
        {
            var index = _codeList.FindIndex(c => c == code);

            var validCode = index >= 0 && !_codeFoundList[index];

            if (validCode)
            {
                _codeTexts[index].color = _codeFoundColor;

                _codeFoundList[index] = true;
            }

            return validCode;
        }

        /// <summary>Updates MinigameResult with a MinigameAttempt</summary>
        private void UpdateResult(int inputIndex, string code, bool success, float responseTime)
        {
            var position = _characterGrid.GetPositionForIndex(inputIndex);

            var currentSeries = _result.levels[0].series[0];

            currentSeries.attempts.Add(new CodesearchAttempt{
                attempt = currentSeries.attempts.Count,
                code = code,
                position_x = ResultUtil.FloatWith3DecimalPlaces(position.x * 2 - 1),
                position_y = ResultUtil.FloatWith3DecimalPlaces(position.y * 2 - 1),
                detection = success ? 1 : 2,
                response_time = ResultUtil.FloatWith3DecimalPlaces(responseTime),
                date_time = DateTime.Now
            });
        }
    }

    public enum CodeSearchDifficulty
    {
        Horizontal,
        Vertical,
        Diagonal
    }
}

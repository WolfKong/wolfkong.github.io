using System.Collections.Generic;
using System.Linq;
using UnityEngine;

namespace Sensorial.Util
{
    public static class RandomUtil
    {
        /// <summary>Returns a Random int within given range not contained on exceptions list.</summary>
        /// <param name="minInclusive">Range minimum value inclusive.</param>
        /// <param name="maxExclusive">Range maximum value exclusive.</param>
        /// <param name="exceptions">List of exceptions.</param>
        public static int RandomWithExceptions(int minInclusive, int maxExclusive, List<int> exceptions)
        {
            var shuffledRange = Enumerable.Range(minInclusive, maxExclusive - minInclusive).Shuffle().ToList();

            foreach (var num in shuffledRange)
                if (!exceptions.Contains(num))
                    return num;

            Debug.LogWarning("Range doesn't contain value outside exceptions!");
            return minInclusive;
        }

        /// <summary>Draws values from given array.</summary>
        /// <param name="amount">Quantity of numbers to draw.</param>
        /// <param name="values">Possible values to draw.</param>
        public static T[] DrawElements<T>(int amount, T[] values)
        {
            var draw = new T[amount];

            for (int i = 0; i < amount; i++)
                draw[i] = values.RandomElement();

            return draw;
        }

        /// <summary>Draws values using given weigths.</summary>
        /// <param name="amount">Quantity of numbers to draw.</param>
        /// <param name="values">Possible values to draw.</param>
        /// <param name="weights">Weight of each possible value.</param>
        public static int[] DrawWithWeights(int amount, int[] values, int[] weights)
        {
            var draw = new int[amount];

            if (values.Length != weights.Length)
            {
                Debug.LogWarning("Wrong input for DrawWithWeights!");
                return draw;
            }

            var percents = PercentsFromWeights(weights.ToList());

            for (int i = 0; i < amount; i++)
            {
                var index = DrawIndexFromPercent(percents);
                draw[i] = (values[index]);
            }

            return draw;
        }

        /// <summary>Draws unique values using given weigths.</summary>
        /// <param name="amount">Quantity of numbers to draw.</param>
        /// <param name="values">Possible values to draw.</param>
        /// <param name="weights">Weight of each possible value.</param>
        public static List<int> DrawUniqueWithWeights(int amount, List<int> values, List<int> weights)
        {
            var draw = new List<int>();

            if (amount > values.Count)
            {
                Debug.LogWarning("Wrong input for DrawUniqueWithWeights! Amount > values.Count");
                return draw;
            }

            if (values.Count != weights.Count)
            {
                Debug.LogWarning("Wrong input for DrawUniqueWithWeights! values.Count != weights.Count");
                return draw;
            }

            draw = DrawUniqueWithWeightsRecursive(amount, values, weights);

            return draw;
        }

        private static List<int> DrawUniqueWithWeightsRecursive(int amount, List<int> values, List<int> weights)
        {
            if (values.Count == amount)
                return values.Shuffle().ToList();

            var draw = new List<int>();

            if (amount <= 0)
                return draw;

            var percents = PercentsFromWeights(weights);

            var index = DrawIndexFromPercent(percents);
            draw.Add(values[index]);
            values.RemoveAt(index);
            weights.RemoveAt(index);

            draw.AddRange(DrawUniqueWithWeightsRecursive(amount - 1, values, weights));

            return draw;
        }

        private static int DrawIndexFromPercent(float[] percents)
        {
            var rdm = Random.value;
            for (int j = 0; j < percents.Length; j++)
            {
                if (rdm < percents[j])
                    return j;
            }

            return 0;
        }

        private static float[] PercentsFromWeights(List<int> weights)
        {
            var percents = new float[weights.Count];
            var weightsSum = weights.Sum(w => w);

            for (int i = 0; i < weights.Count; i++)
            {
                var previousPercent = i > 0 ? percents[i - 1] : 0;
                percents[i] = previousPercent + (float)weights[i] / weightsSum;
            }

            return percents;
        }
    }
}

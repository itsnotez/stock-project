<template>
  <article>
    <nav>
      <ul>
        <li
          @click="setName('삼성전자')"
          :class="{ 'nav-active': name === '삼성전자' }"
        >
          삼성전자
        </li>
        <li
          @click="setName('현대모비스')"
          :class="{ 'nav-active': name === '현대모비스' }"
        >
          삼성전자
        </li>
        <li
          @click="setName('카카오')"
          :class="{ 'nav-active': name === '카카오' }"
        >
          삼성전자
        </li>
        <li
          @click="setName('네이버')"
          :class="{ 'nav-active': name === '네이버' }"
        >
          삼성전자
        </li>
      </ul>
    </nav>
    <div class="back" v-if="loading">
      <div class="background">
        <div class="vs-loading default"></div>
        <div class="effect-1 effects"></div>
        <div class="effect-2 effects"></div>
        <div class="effect-3 effects"></div>
      </div>
    </div>
    <div>
      <h1>{{ herestk }}</h1>
      <p class="message">{{ message }}</p>
      <p>{{ name }} - 목표매수금액</p>
      <div class="target">
        <input v-model.number="targetCur" type="number" steo="500" />
        <button @click="setTarget()">설정</button>
      </div>
    </div>
    <div class="svgWrap">
      <svg />
    </div>
    <div class="tableWrap">
      <table>
        <thead>
          <tr>
            <th>날짜</th>
            <th>종가</th>
            <th>증감</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(stock, idx) in herestksise" :key="idx">
            <td>{{ stock.date }}</td>
            <td>{{ stock.value }}</td>
            <td :class="{ active: stock.isInc, 'not-active': !stock.isInc }">
              <i v-if="stock.isInc"
                ><img
                  src="https://ssl.pstatic.net/imgstock/images/images4/ico_up.gif"
                  width="7"
                  height="6"
                  style="margin-right: 4px"
                  alt="상승"
              /></i>
              <i v-else
                ><img
                  src="https://ssl.pstatic.net/imgstock/images/images4/ico_down.gif"
                  width="7"
                  height="6"
                  style="margin-right: 4px"
                  alt="하락"
              /></i>
              {{ stock.increaseOrdecrease }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </article>
</template>

<script>
import * as d3 from "d3";
import { onMounted, ref } from "vue";
import axios from "axios";

export default {
  name: "App",
  components: {},
  setup() {
    let name = ref("삼성전자");
    let message = ref("");
    let targetCur = ref(0);
    let herestk = ref({});
    let herestksise = ref([]);
    let loading = ref(true);

    const draw = (target, now) => {
      d3.select("svg").selectAll("g").remove();
      const remain = ((now - Math.max(now - target, 0)) / now) * 100;
      if (remain === 100) {
        message.value = `지금 사야 합니다!`;
      } else if (remain >= 50) {
        message.value = `${Math.round(remain)}%예요 좀만 참으세요`;
      } else {
        message.value = `${Math.round(remain)}%입니다. 장기적으로 바라보세요`;
      }
      const width = 350;
      const height = 350;
      const radius = Math.min(width, height) / 2.3;
      const group = d3
        .select("svg")
        .attr("width", width)
        .attr("height", height)
        .append("g")
        .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

      const pieGenerator = d3.pie().sort(null);
      const arc = d3
        .arc()
        .innerRadius(radius * 0.9)
        .outerRadius(radius);

      const textDOM = group
        .append("text")
        .attr("text-anchor", "middle")
        .attr("dy", ".3em")
        .attr("font-size", "3rem")
        .attr("font-weight", "bold");

      group
        .append("text")
        .attr("text-anchor", "middle")
        .attr("dy", "-2em")
        .text("목표까지");
    };
  },
};
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
</style>

import Vue from "vue";
import Sample from "./components/Sample.vue";
import Host from "./components/Host.vue";
import Audience from "./components/Audience.vue";

const app = new Vue({
    el: "#container",
    components: {
        Sample,
        Host,
        Audience,
    },
});